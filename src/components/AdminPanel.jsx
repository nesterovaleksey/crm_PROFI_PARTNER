import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import * as XLSX from 'xlsx';
import { Upload, Trash2, CheckCircle2, AlertTriangle, FileText, RefreshCw, Layers, UserCheck, Plus, Search, Edit2, X, Shield, User, ToggleLeft, ToggleRight } from 'lucide-react';

export default function AdminPanel() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [uploadsLog, setUploadsLog] = useState([]);
  
  // Results summary
  const [parsedCount, setParsedCount] = useState(0);
  const [unmatchedDrivers, setUnmatchedDrivers] = useState([]);

  // Driver Management States
  const [adminTab, setAdminTab] = useState('import'); // 'import' or 'drivers'
  const [drivers, setDrivers] = useState([]);
  const [driversLoading, setDriversLoading] = useState(false);
  const [driversError, setDriversError] = useState('');
  const [driversSuccess, setDriversSuccess] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'active', 'inactive', 'admin'
  
  // Modal & Form States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('add'); // 'add' or 'edit'
  const [editingDriverId, setEditingDriverId] = useState(null);
  const [formFio, setFormFio] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formTgId, setFormTgId] = useState('');
  const [formIsActive, setFormIsActive] = useState(true);
  const [formIsAdmin, setFormIsAdmin] = useState(false);
  const [formLoading, setFormLoading] = useState(false);

  useEffect(() => {
    fetchUploadsLog();
  }, []);

  useEffect(() => {
    if (adminTab === 'drivers') {
      fetchDrivers();
    }
  }, [adminTab]);

  const fetchUploadsLog = async () => {
    try {
      const { data, error: err } = await supabase
        .from('weekly_incomes')
        .select('file_name, period_name, created_at')
        .order('created_at', { ascending: false });

      if (err) throw err;

      // Group by file_name and period_name to list uploads
      const grouped = {};
      data.forEach(item => {
        if (!item.file_name) return;
        if (!grouped[item.file_name]) {
          grouped[item.file_name] = {
            fileName: item.file_name,
            periodName: item.period_name,
            count: 0,
            uploadedAt: item.created_at
          };
        }
        grouped[item.file_name].count += 1;
      });

      setUploadsLog(Object.values(grouped));
    } catch (err) {
      console.error('Error fetching uploads log:', err);
    }
  };

  const fetchDrivers = async () => {
    setDriversLoading(true);
    setDriversError('');
    try {
      const { data, error: err } = await supabase
        .from('drivers')
        .select('*')
        .order('full_name', { ascending: true });

      if (err) throw err;
      setDrivers(data || []);
    } catch (err) {
      console.error('Error fetching drivers:', err);
      setDriversError('Не удалось загрузить список водителей.');
    } finally {
      setDriversLoading(false);
    }
  };

  const handleToggleActive = async (driver) => {
    try {
      const newStatus = !driver.is_active;
      // Optimistic update
      setDrivers(prev => prev.map(d => d.id === driver.id ? { ...d, is_active: newStatus } : d));
      
      const { error: err } = await supabase
        .from('drivers')
        .update({ is_active: newStatus })
        .eq('id', driver.id);

      if (err) throw err;
      setDriversSuccess(`Статус водителя "${driver.full_name}" успешно изменен!`);
      // Clear message after a short delay
      setTimeout(() => setDriversSuccess(''), 4000);
    } catch (err) {
      console.error('Error toggling driver status:', err);
      setDriversError('Не удалось изменить статус водителя.');
      fetchDrivers();
    }
  };

  const handleSaveDriver = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    setDriversError('');
    setDriversSuccess('');

    const cleanFio = formFio.trim();
    const cleanEmail = formEmail.trim().toLowerCase();
    const parsedTgId = formTgId ? parseInt(formTgId.toString().trim(), 10) : null;

    if (!cleanFio || !cleanEmail) {
      setDriversError('ФИО и E-mail обязательны для заполнения.');
      setFormLoading(false);
      return;
    }

    if (formTgId && isNaN(parsedTgId)) {
      setDriversError('Telegram ID должен быть числом.');
      setFormLoading(false);
      return;
    }

    try {
      if (modalMode === 'add') {
        const { error: err } = await supabase
          .from('drivers')
          .insert({
            full_name: cleanFio,
            email: cleanEmail,
            telegram_id: parsedTgId,
            is_active: formIsActive,
            is_admin: formIsAdmin
          });

        if (err) throw err;
        setDriversSuccess(`Водитель "${cleanFio}" успешно добавлен!`);
      } else {
        const { error: err } = await supabase
          .from('drivers')
          .update({
            full_name: cleanFio,
            email: cleanEmail,
            telegram_id: parsedTgId,
            is_active: formIsActive,
            is_admin: formIsAdmin
          })
          .eq('id', editingDriverId);

        if (err) throw err;
        setDriversSuccess(`Данные водителя "${cleanFio}" успешно обновлены!`);
      }

      setIsModalOpen(false);
      fetchDrivers();
      setTimeout(() => setDriversSuccess(''), 4000);
    } catch (err) {
      console.error('Error saving driver:', err);
      let errMsg = 'Не удалось сохранить данные водителя.';
      if (err.code === '23505') {
        if (err.message && err.message.includes('email')) {
          errMsg = 'Водитель с таким E-mail уже зарегистрирован.';
        } else if (err.message && err.message.includes('telegram_id')) {
          errMsg = 'Водитель с таким Telegram ID уже зарегистрирован.';
        } else {
          errMsg = 'E-mail или Telegram ID уже используется другим водителем.';
        }
      }
      setDriversError(errMsg);
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteDriver = async (driver) => {
    const confirmMsg = `Вы действительно хотите удалить водителя "${driver.full_name}"? \n\nВНИМАНИЕ: Это действие удалит все связанные с ним доходы за все недели! Это действие необратимо.`;
    if (!window.confirm(confirmMsg)) return;

    setDriversLoading(true);
    setDriversError('');
    setDriversSuccess('');
    try {
      const { error: err } = await supabase
        .from('drivers')
        .delete()
        .eq('id', driver.id);

      if (err) throw err;
      setDriversSuccess(`Водитель "${driver.full_name}" успешно удален.`);
      fetchDrivers();
      setTimeout(() => setDriversSuccess(''), 4000);
    } catch (err) {
      console.error('Error deleting driver:', err);
      setDriversError('Не удалось удалить водителя.');
      setDriversLoading(false);
    }
  };

  const openAddModal = () => {
    setModalMode('add');
    setEditingDriverId(null);
    setFormFio('');
    setFormEmail('');
    setFormTgId('');
    setFormIsActive(true);
    setFormIsAdmin(false);
    setDriversError('');
    setIsModalOpen(true);
  };

  const openEditModal = (driver) => {
    setModalMode('edit');
    setEditingDriverId(driver.id);
    setFormFio(driver.full_name);
    setFormEmail(driver.email);
    setFormTgId(driver.telegram_id || '');
    setFormIsActive(driver.is_active);
    setFormIsAdmin(driver.is_admin);
    setDriversError('');
    setIsModalOpen(true);
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setError('');
      setSuccess('');
      setUnmatchedDrivers([]);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) return;

    setLoading(true);
    setError('');
    setSuccess('');
    setUnmatchedDrivers([]);

    try {
      // 1. Extract Period (Week) from file name
      const nameParts = file.name.split('.');
      const rawPeriod = nameParts[0] || 'Unknown';
      const currentYear = new Date().getFullYear();
      const periodName = `${rawPeriod} ${currentYear}`;

      // 2. Check if this file was already uploaded
      const { data: existing, error: existErr } = await supabase
        .from('weekly_incomes')
        .select('id')
        .eq('file_name', file.name)
        .limit(1);

      if (existErr) throw existErr;
      if (existing && existing.length > 0) {
        setError(`Реестр "${file.name}" уже был загружен ранее. Откатите предыдущую загрузку этого файла в логах ниже перед повторной отправкой.`);
        setLoading(false);
        return;
      }

      // 3. Load drivers
      const { data: dbDrivers, error: driversErr } = await supabase
        .from('drivers')
        .select('*');

      if (driversErr) throw driversErr;

      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const data = new Uint8Array(event.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const sheet = workbook.Sheets[sheetName];
          
          const rawRows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
          
          if (rawRows.length < 2) {
            throw new Error('Файл пуст или поврежден (нет строк данных).');
          }

          // Generate headers map
          const headers = rawRows[0];
          const indexMap = {};
          headers.forEach((h, idx) => {
            if (h) indexMap[h.toString().trim()] = idx;
          });

          // Required columns validation
          const requiredColumns = ['Imię Nazwisko', 'VAT', 'Partner', 'Auto', 'ZUS', 'Do wypłaty'];
          const missing = requiredColumns.filter(c => indexMap[c] === undefined);
          if (missing.length > 0) {
            throw new Error(`В файле отсутствуют обязательные колонки: ${missing.join(', ')}`);
          }

          // Helpers for alternative column layouts
          const getColIndex = (options) => {
            for (let opt of options) {
              if (indexMap[opt] !== undefined) return indexMap[opt];
            }
            return -1;
          };

          const uberGotowkaIdx = getColIndex(['Uber Netto\n(gotówka)', 'Uber Netto (gotówka)', 'Uber Netto (gotowka)']);
          const uberIdx = getColIndex(['Uber Netto']);
          const boltGotowkaIdx = getColIndex(['Bolt Netto (gotówka)', 'Bolt Netto (gotowka)']);
          const boltIdx = getColIndex(['Bolt Netto ', 'Bolt Netto']);
          const freenowKIdx = getColIndex(['FreeNow Netto ', 'FreeNow Netto (k)', 'FreeNow Netto k']);
          const freenowLIdx = getColIndex(['FreeNow Netto', 'FreeNow Netto (l)', 'FreeNow Netto l']);
          
          const vatIdx = indexMap['VAT'];
          const partnerIdx = indexMap['Partner'];
          const autoIdx = indexMap['Auto'];
          const korektyIdx = getColIndex(['Korekty', 'Inne']);
          const zusIdx = indexMap['ZUS'];
          
          const doWyplatyIdx = indexMap['Do wypłaty'];
          const zwrotIdx = getColIndex(['Zwrot kosztów', 'Zwrot kosztow']);
          const umowaIdx = getColIndex(['Umowa zlecenie', 'Umowa zlecenie']);

          // New columns indices
          const imieNazwiskoIdx = indexMap['Imię Nazwisko'];
          const numerTelIdx = getColIndex(['Numer Tel', 'Numer telefonu', 'Phone']);
          const emailIdx = getColIndex(['E-mail', 'Email']);
          const uberBruttoIdx = getColIndex(['Uber Brutto']);
          const boltBruttoIdx = getColIndex(['Bolt Brutto']);
          const freenowBruttoIdx = getColIndex(['FreeNow Brutto']);
          const brutto3AplIdx = getColIndex(['Brutto 3 apl']);
          const umowaNajmuIdx = getColIndex(['Umowa najmu']);

          const incomesToInsert = [];
          const localUnmatched = [];

          // Parse
          for (let i = 1; i < rawRows.length; i++) {
            const row = rawRows[i];
            if (!row || row.length === 0) continue;

            const nameVal = row[indexMap['Imię Nazwisko']];
            if (!nameVal) continue;
            
            const driverFio = nameVal.toString().trim();
            if (['Suma', 'Razem', 'Podsumowanie', 'VAT BRUTTO', 'Imię Nazwisko'].includes(driverFio) || driverFio.toLowerCase().includes('brutto')) {
              continue;
            }

            const matchingDriver = dbDrivers.find(d => 
              d.full_name.trim().toLowerCase() === driverFio.toLowerCase()
            );

            if (!matchingDriver) {
              localUnmatched.push(driverFio);
              continue;
            }

            const num = (idx) => {
              if (idx === -1 || row[idx] === undefined || row[idx] === null) return 0;
              const val = parseFloat(row[idx].toString().replace(',', '.'));
              return isNaN(val) ? 0 : val;
            };

            const txt = (idx) => {
              if (idx === -1 || row[idx] === undefined || row[idx] === null) return '';
              return row[idx].toString().trim();
            };

            incomesToInsert.push({
              driver_id: matchingDriver.id,
              period_name: periodName,
              file_name: file.name,
              uber_netto_gotowka: num(uberGotowkaIdx),
              uber_netto: num(uberIdx),
              bolt_netto_gotowka: num(boltGotowkaIdx),
              bolt_netto: num(boltIdx),
              freenow_netto_k: num(freenowKIdx),
              freenow_netto_l: num(freenowLIdx),
              vat: num(vatIdx),
              partner: num(partnerIdx),
              auto: num(autoIdx),
              korekty: num(korektyIdx),
              zus: num(zusIdx),
              do_wyplaty: num(doWyplatyIdx),
              zwrot_kosztow: num(zwrotIdx),
              umowa_zlecenie: num(umowaIdx),
              
              // New columns
              imie_nazwisko: txt(imieNazwiskoIdx),
              numer_tel: txt(numerTelIdx),
              email: txt(emailIdx),
              uber_brutto: num(uberBruttoIdx),
              bolt_brutto: num(boltBruttoIdx),
              freenow_brutto: num(freenowBruttoIdx),
              brutto_3_apl: num(brutto3AplIdx),
              umowa_najmu: num(umowaNajmuIdx),
            });
          }

          if (incomesToInsert.length === 0) {
            throw new Error('В реестре не найдено совпадений с базой водителей PROFI CRM.');
          }

          // Insert
          const { error: insertErr } = await supabase
            .from('weekly_incomes')
            .insert(incomesToInsert);

          if (insertErr) throw insertErr;

          setSuccess(`Успешно импортировано доходов: ${incomesToInsert.length} записей за неделю "${periodName}"!`);
          setParsedCount(incomesToInsert.length);
          setUnmatchedDrivers(localUnmatched);
          setFile(null);
          
          const fileInput = document.getElementById('file-upload');
          if (fileInput) fileInput.value = '';
          
          fetchUploadsLog();
        } catch (innerErr) {
          setError(innerErr.message || 'Ошибка обработки данных внутри Excel.');
        } finally {
          setLoading(false);
        }
      };

      reader.readAsArrayBuffer(file);
    } catch (err) {
      console.error('Error uploading excel:', err);
      setError(err.message || 'Произошла непредвиденная ошибка при загрузке.');
      setLoading(false);
    }
  };

  const handleRollback = async (fileName) => {
    if (!window.confirm(`Вы действительно хотите удалить все записи доходов, импортированные из файла "${fileName}"? Это действие сбросит данные для всех затронутых водителей.`)) {
      return;
    }

    setLoading(true);
    try {
      const { error: delErr } = await supabase
        .from('weekly_incomes')
        .delete()
        .eq('file_name', fileName);

      if (delErr) throw delErr;

      setSuccess(`Импорт файла "${fileName}" успешно откатана.`);
      fetchUploadsLog();
    } catch (err) {
      console.error('Error during rollback:', err);
      setError('Не удалось откатить загрузку файла.');
    } finally {
      setLoading(false);
    }
  };

  const filteredDrivers = drivers.filter(driver => {
    const query = searchQuery.toLowerCase().trim();
    const matchesSearch = 
      driver.full_name.toLowerCase().includes(query) ||
      driver.email.toLowerCase().includes(query) ||
      (driver.telegram_id && driver.telegram_id.toString().includes(query));

    if (!matchesSearch) return false;

    if (statusFilter === 'active') return driver.is_active;
    if (statusFilter === 'inactive') return !driver.is_active;
    if (statusFilter === 'admin') return driver.is_admin;

    return true;
  });

  return (
    <div className="space-y-6">
      {/* Sub-tab switcher */}
      <div className="flex p-1 bg-[var(--bg-main)] border border-[var(--border-glass)] rounded-xl max-w-xs mx-auto mb-2">
        <button
          onClick={() => {
            setAdminTab('import');
            setDriversError('');
            setDriversSuccess('');
          }}
          className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            adminTab === 'import'
              ? 'btn-primary shadow-none'
              : 'text-[var(--text-dim)] hover:text-white'
          }`}
        >
          Импорт реестров
        </button>
        <button
          onClick={() => {
            setAdminTab('drivers');
            setDriversError('');
            setDriversSuccess('');
          }}
          className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            adminTab === 'drivers'
              ? 'btn-primary shadow-none'
              : 'text-[var(--text-dim)] hover:text-white'
          }`}
        >
          Водители
        </button>
      </div>

      {adminTab === 'import' ? (
        <div className="space-y-6">
          {/* Upload Panel */}
          <div className="glass-card p-6">
            <h2 className="text-md font-bold uppercase tracking-wider text-[var(--accent-light)] flex items-center gap-2 mb-2">
              <Upload size={18} />
              <span>Импорт недельного реестра</span>
            </h2>
            <p className="text-xs text-[var(--text-muted)] mb-5">
              Загрузите еженедельный Excel-файл. Приложение автоматически сопоставит строки с водителями по ФИО, отфильтрует служебные строки и выполнит расчеты.
            </p>

            {error && (
              <div className="mb-4 p-3.5 bg-[var(--error-glow)] border border-[var(--danger)]/20 text-[var(--danger)] rounded-xl flex gap-2.5 items-start text-xs">
                <AlertTriangle className="shrink-0 mt-0.5" size={16} />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="mb-4 p-3.5 bg-[var(--success-glow)] border border-[var(--success)]/20 text-[var(--success)] rounded-xl flex gap-2.5 items-start text-xs">
                <CheckCircle2 className="shrink-0 mt-0.5" size={16} />
                <span>{success}</span>
              </div>
            )}

            <form onSubmit={handleUpload} className="space-y-4">
              <div className="border border-dashed border-[var(--border-glass)] hover:border-[var(--accent-light)]/40 rounded-2xl p-7 text-center cursor-pointer transition-all relative bg-black/10">
                <input
                  type="file"
                  id="file-upload"
                  accept=".xlsx, .xls"
                  onChange={handleFileChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  disabled={loading}
                />
                <FileText className="mx-auto text-[var(--text-dim)] mb-3" size={36} />
                <span className="block text-sm font-semibold text-[var(--text-primary)] mb-1">
                  {file ? file.name : 'Выберите файл реестра .xlsx'}
                </span>
                <span className="text-xs text-[var(--text-dim)]">
                  {file ? `${(file.size / 1024).toFixed(1)} KB` : 'Нажмите здесь или перетащите файл'}
                </span>
              </div>

              <button
                type="submit"
                className="w-full btn-primary"
                disabled={!file || loading}
              >
                {loading ? (
                  <RefreshCw className="animate-spin" size={18} />
                ) : (
                  <span>Импортировать и рассчитать</span>
                )}
              </button>
            </form>

            {/* Skipped Drivers warn */}
            {unmatchedDrivers.length > 0 && (
              <div className="mt-5 p-4 bg-[var(--bg-darker)] border border-[var(--border-glass)] rounded-xl space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--warning)] flex items-center gap-1.5">
                  <UserCheck size={16} />
                  <span>Пропущено водителей ({unmatchedDrivers.length})</span>
                </h4>
                <p className="text-[10px] text-[var(--text-muted)]">
                  Эти имена были в Excel-файле, но их нет в базе данных Supabase (их данные не были записаны):
                </p>
                <div className="max-h-24 overflow-y-auto text-xs font-mono bg-black/20 p-2.5 rounded-lg border border-[var(--border-glass)] text-[var(--text-dim)]">
                  {unmatchedDrivers.map((name, i) => (
                    <div key={i} className="py-0.5 border-b border-[var(--border-glass)] last:border-0">{name}</div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* History Log Panel */}
          <div className="glass-card p-6">
            <h2 className="text-md font-bold uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-2 mb-2">
              <Layers size={18} />
              <span>Архив импортов и откат</span>
            </h2>
            <p className="text-xs text-[var(--text-muted)] mb-5">
              Вы можете отменить любую загрузку реестра. База данных полностью удалит соответствующие расчеты.
            </p>

            {uploadsLog.length === 0 ? (
              <div className="text-center py-8 border border-[var(--border-glass)] rounded-2xl text-xs text-[var(--text-dim)] bg-black/10">
                Загруженные файлы отсутствуют.
              </div>
            ) : (
              <div className="space-y-3.5">
                {uploadsLog.map((upload) => (
                  <div
                    key={upload.fileName}
                    className="flex items-center justify-between p-4 bg-[var(--bg-darker)] border border-[var(--border-glass)] rounded-2xl hover:border-[var(--text-dim)] transition-all text-xs"
                  >
                    <div className="space-y-1.5">
                      <div className="font-semibold text-[var(--text-primary)]">{upload.fileName}</div>
                      <div className="text-[10px] text-[var(--text-dim)] flex flex-wrap gap-x-2 gap-y-0.5 items-center">
                        <span className="bg-[var(--accent)]/10 text-[var(--accent-light)] px-1.5 py-0.5 rounded font-bold">
                          {upload.periodName}
                        </span>
                        <span>•</span>
                        <span>Записей: <strong className="text-[var(--text-muted)]">{upload.count}</strong></span>
                        <span>•</span>
                        <span>{new Date(upload.uploadedAt).toLocaleDateString('ru-RU')}</span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleRollback(upload.fileName)}
                      className="p-2 text-[var(--danger)] bg-[var(--danger-glow)] hover:bg-[var(--danger)]/30 rounded-xl border border-[var(--danger)]/20 transition-all shrink-0 ml-4"
                      title="Удалить начисления"
                      disabled={loading}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Driver Management Section */
        <div className="space-y-6 animate-fadeIn">
          <div className="glass-card p-6">
            <div className="flex-between mb-4 flex-wrap gap-4">
              <h2 className="text-md font-bold uppercase tracking-wider text-[var(--accent-light)] flex items-center gap-2">
                <User size={18} />
                <span>Управление водителями</span>
              </h2>
              <button onClick={openAddModal} className="btn-primary !py-2 !px-4 !text-xs flex items-center gap-1.5">
                <Plus size={14} />
                <span>Добавить водителя</span>
              </button>
            </div>

            {driversSuccess && (
              <div className="mb-4 p-3.5 bg-[var(--success-glow)] border border-[var(--success)]/20 text-[var(--success)] rounded-xl flex gap-2.5 items-start text-xs">
                <CheckCircle2 className="shrink-0 mt-0.5" size={16} />
                <span>{driversSuccess}</span>
              </div>
            )}

            {driversError && (
              <div className="mb-4 p-3.5 bg-[var(--error-glow)] border border-[var(--danger)]/20 text-[var(--danger)] rounded-xl flex gap-2.5 items-start text-xs">
                <AlertTriangle className="shrink-0 mt-0.5" size={16} />
                <span>{driversError}</span>
              </div>
            )}

            {/* Filters Row */}
            <div className="grid-2-col gap-4 mb-5">
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-[var(--text-dim)]">
                  <Search size={14} />
                </span>
                <input
                  type="text"
                  placeholder="Поиск по ФИО, email, Telegram ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="input-field pl-9 !py-2.5 !text-xs"
                />
              </div>

              <div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="input-field !py-2.5 !text-xs cursor-pointer"
                  style={{
                    backgroundImage: `url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%239b92b6' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3E%3C/svg%3E")`,
                    backgroundPosition: 'right 0.75rem center',
                    backgroundSize: '1.25rem',
                    backgroundRepeat: 'no-repeat',
                    paddingRight: '2rem'
                  }}
                >
                  <option value="all">Все водители</option>
                  <option value="active">Только активные</option>
                  <option value="inactive">Только неактивные</option>
                  <option value="admin">Администраторы</option>
                </select>
              </div>
            </div>

            {/* Drivers List */}
            {driversLoading ? (
              <div className="flex-col flex-center py-16">
                <RefreshCw className="animate-spin text-accent mb-3" size={28} />
                <span className="text-xs text-dim">Загрузка списка водителей...</span>
              </div>
            ) : filteredDrivers.length === 0 ? (
              <div className="text-center py-10 border border-[var(--border-glass)] rounded-2xl text-xs text-[var(--text-dim)] bg-black/10">
                Водители не найдены.
              </div>
            ) : (
              <div className="space-y-3.5">
                {filteredDrivers.map(driver => (
                  <div
                    key={driver.id}
                    className="flex flex-col md:flex-row md:items-center justify-between p-4 bg-[var(--bg-darker)] border border-[var(--border-glass)] rounded-2xl hover:border-[var(--text-dim)] transition-all gap-4 text-xs"
                  >
                    <div className="space-y-1.5 text-left">
                      <div className="flex items-center gap-2 flex-wrap">
                        <strong className="text-[var(--text-primary)] text-sm">{driver.full_name}</strong>
                        {driver.is_admin && (
                          <span className="bg-[var(--accent)]/10 text-[var(--accent-light)] px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider flex items-center gap-0.5">
                            <Shield size={10} /> Admin
                          </span>
                        )}
                        {!driver.is_active && (
                          <span className="bg-[var(--danger-glow)] text-[var(--danger)] px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider">
                            Неактивен
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-[var(--text-dim)] space-y-0.5">
                        <div>Email: <span className="text-[var(--text-muted)] font-mono">{driver.email}</span></div>
                        <div>Telegram ID: {driver.telegram_id ? (
                          <span className="text-[var(--text-muted)] font-mono">{driver.telegram_id}</span>
                        ) : (
                          <span className="text-[var(--warning)] italic">не привязан</span>
                        )}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 self-end md:self-center">
                      {/* Active/Inactive Toggle */}
                      <button
                        onClick={() => handleToggleActive(driver)}
                        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border transition-all ${
                          driver.is_active
                            ? 'bg-[var(--success-glow)] text-[var(--success)] border-[var(--success)]/20 hover:bg-[var(--success)]/30'
                            : 'bg-black/20 text-[var(--text-dim)] border-[var(--border-glass)] hover:bg-black/35'
                        }`}
                        title={driver.is_active ? 'Деактивировать' : 'Активировать'}
                      >
                        {driver.is_active ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                        <span className="font-semibold text-[10px]">
                          {driver.is_active ? 'Активен' : 'Отключен'}
                        </span>
                      </button>

                      {/* Edit Button */}
                      <button
                        onClick={() => openEditModal(driver)}
                        className="p-2 text-[var(--accent-light)] bg-[var(--accent)]/10 hover:bg-[var(--accent)]/20 rounded-xl border border-[var(--accent)]/20 transition-all"
                        title="Редактировать"
                      >
                        <Edit2 size={14} />
                      </button>

                      {/* Delete Button */}
                      <button
                        onClick={() => handleDeleteDriver(driver)}
                        className="p-2 text-[var(--danger)] bg-[var(--danger-glow)] hover:bg-[var(--danger)]/30 rounded-xl border border-[var(--danger)]/20 transition-all"
                        title="Удалить"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Driver Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="glass-card w-full max-w-md p-6 relative overflow-hidden">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 text-[var(--text-dim)] hover:text-white transition-colors"
            >
              <X size={20} />
            </button>
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <User className="text-[var(--accent)]" size={20} />
              <span>{modalMode === 'add' ? 'Добавить водителя' : 'Редактировать водителя'}</span>
            </h3>

            {driversError && (
              <div className="mb-4 p-3 bg-[var(--error-glow)] border border-[var(--danger)]/20 text-[var(--danger)] rounded-xl flex gap-2 items-start text-xs">
                <AlertTriangle className="shrink-0 mt-0.5" size={14} />
                <span>{driversError}</span>
              </div>
            )}

            <form onSubmit={handleSaveDriver} className="space-y-4">
              <div className="text-left">
                <label className="block text-[10px] font-bold text-[var(--text-dim)] uppercase tracking-wider mb-1.5">
                  ФИО водителя *
                </label>
                <input
                  type="text"
                  placeholder="Иванов Иван Иванович"
                  value={formFio}
                  onChange={(e) => setFormFio(e.target.value)}
                  className="input-field"
                  required
                  disabled={formLoading}
                />
              </div>

              <div className="text-left">
                <label className="block text-[10px] font-bold text-[var(--text-dim)] uppercase tracking-wider mb-1.5">
                  E-mail *
                </label>
                <input
                  type="email"
                  placeholder="driver@example.com"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  className="input-field"
                  required
                  disabled={formLoading}
                />
              </div>

              <div className="text-left">
                <label className="block text-[10px] font-bold text-[var(--text-dim)] uppercase tracking-wider mb-1.5">
                  Telegram ID (Не обязательно)
                </label>
                <input
                  type="text"
                  placeholder="Например, 123456789"
                  value={formTgId}
                  onChange={(e) => setFormTgId(e.target.value)}
                  className="input-field"
                  disabled={formLoading}
                />
              </div>

              <div className="flex gap-6 pt-2">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={formIsActive}
                    onChange={(e) => setFormIsActive(e.target.checked)}
                    className="w-4 h-4 rounded border-[var(--border-glass)] bg-black/40 text-[var(--accent)] focus:ring-0 focus:ring-offset-0"
                    disabled={formLoading}
                  />
                  <span className="text-xs text-[var(--text-muted)] font-semibold">Активен</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={formIsAdmin}
                    onChange={(e) => setFormIsAdmin(e.target.checked)}
                    className="w-4 h-4 rounded border-[var(--border-glass)] bg-black/40 text-[var(--accent)] focus:ring-0 focus:ring-offset-0"
                    disabled={formLoading}
                  />
                  <span className="text-xs text-[var(--text-muted)] font-semibold">Администратор</span>
                </label>
              </div>

              <div className="flex gap-3 pt-4 border-t border-[var(--border-glass)]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="w-1/3 btn-secondary !py-2.5 !text-xs"
                  disabled={formLoading}
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="w-2/3 btn-primary !py-2.5 !text-xs"
                  disabled={formLoading}
                >
                  {formLoading ? (
                    <RefreshCw className="animate-spin" size={16} />
                  ) : (
                    <span>Сохранить</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
