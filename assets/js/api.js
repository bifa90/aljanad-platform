/* ============================================================
   منصة الجند التعليمية - طبقة API
   Al-Janad Educational Platform - API Layer
   ============================================================ */

(function (global) {
  'use strict';

  /* ==========================================================
     الإعدادات
     ========================================================== */
  var CONFIG = {
    // ⚠️ استبدل هذا برابط Web App بعد نشره
    APPS_SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbymeaVNqqSKfssuY89x3KeFqv96W8zaRe2PH6KoUpL6q2PQaQEo0bx-Q1eyNUYfUERToQ/exec',

    // رقم واتساب المشرف
    ADMIN_WHATSAPP: '967777410332',

    // مفتاح التشفير (يجب أن يطابق أداة المشرف)
    SECRET_KEY: 'ALJANAD2026',

    // اسم المنصة
    PLATFORM_NAME: 'منصة الجند التعليمية',

    // مفتاح الجلسة في localStorage
    SESSION_KEY: 'aljanad_session',

    // روابط المنصة
    BASE_URL: 'https://just-taiz.blogspot.com',

    // خرائط الترجمة
    COLLEGE_NAMES: {
      'ENG': 'كلية الهندسة وتقنية المعلومات'
    },
    DEPARTMENT_NAMES: {
      'ARCH':  'قسم الهندسة المعمارية',
      'CIVIL': 'قسم التصميم الداخلي'
    },
    LEVEL_NAMES: {
      '1': 'المستوى الأول',
      '2': 'المستوى الثاني',
      '3': 'المستوى الثالث',
      '4': 'المستوى الرابع'
    }
  };

  /* ==========================================================
     أدوات التشفير
     ========================================================== */

  function encryptData(obj, key) {
    key = key || CONFIG.SECRET_KEY;
    var json = JSON.stringify(obj);
    var bytes = new TextEncoder().encode(json);
    var keyBytes = new TextEncoder().encode(key);
    var encrypted = new Uint8Array(bytes.length);

    for (var i = 0; i < bytes.length; i++) {
      encrypted[i] = bytes[i] ^ keyBytes[i % keyBytes.length];
    }

    var binary = '';
    for (var j = 0; j < encrypted.length; j++) {
      binary += String.fromCharCode(encrypted[j]);
    }
    return btoa(binary);
  }

  function decryptData(b64, key) {
    key = key || CONFIG.SECRET_KEY;
    var binary = atob(b64);
    var encrypted = new Uint8Array(binary.length);

    for (var i = 0; i < binary.length; i++) {
      encrypted[i] = binary.charCodeAt(i);
    }

    var keyBytes = new TextEncoder().encode(key);
    var decrypted = new Uint8Array(encrypted.length);

    for (var j = 0; j < encrypted.length; j++) {
      decrypted[j] = encrypted[j] ^ keyBytes[j % keyBytes.length];
    }

    return JSON.parse(new TextDecoder().decode(decrypted));
  }

  /* ==========================================================
     توليد الأكواد
     ========================================================== */

  function generateAccessCode() {
    var chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    var code = 'HA1-';
    for (var i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  /* ==========================================================
     التحقق من البيانات
     ========================================================== */

  function validatePhone(phone) {
    if (!phone) return false;
    var cleaned = String(phone).replace(/\s+/g, '').replace(/^0/, '');
    return /^[0-9]{9,12}$/.test(cleaned);
  }

  function validateRegistration(data) {
    var errors = {};
    var valid = true;

    if (!data.name || data.name.trim().length < 3) {
      errors.name = 'الاسم يجب أن يكون 3 أحرف على الأقل';
      valid = false;
    }

    if (!validatePhone(data.phone)) {
      errors.phone = 'رقم الهاتف غير صحيح (9 إلى 12 رقمًا)';
      valid = false;
    }

    if (!data.college)    { errors.college = 'اختر الكلية';   valid = false; }
    if (!data.department) { errors.dept    = 'اختر القسم';    valid = false; }
    if (!data.level)      { errors.level   = 'اختر المستوى';  valid = false; }

    return { valid: valid, errors: errors };
  }

  function validateAccessCode(code) {
    if (!code) return false;
    var cleaned = String(code).trim().toUpperCase();
    return /^HA1-[A-Z0-9]{8}$/.test(cleaned);
  }

  /* ==========================================================
     أدوات الواجهة
     ========================================================== */

  function showErrors(errors, prefix) {
    prefix = prefix || '';
    document.querySelectorAll('.error-msg').forEach(function (el) {
      el.textContent = '';
    });
    document.querySelectorAll('.input-wrapper').forEach(function (el) {
      el.classList.remove('error');
    });

    Object.keys(errors).forEach(function (key) {
      var errEl = document.getElementById(prefix + key + 'Error');
      var inputEl = document.getElementById(prefix + key);
      if (errEl) errEl.textContent = errors[key];
      if (inputEl) {
        var wrapper = inputEl.closest('.input-wrapper');
        if (wrapper) wrapper.classList.add('error');
        else inputEl.classList.add('error');
      }
    });
  }

  function setLoading(loading, btnId, textId, loaderId) {
    btnId    = btnId    || 'submitBtn';
    textId   = textId   || 'btnText';
    loaderId = loaderId || 'btnLoader';

    var btn = document.getElementById(btnId);
    var text = document.getElementById(textId);
    var loader = document.getElementById(loaderId);

    if (!btn) return;

    if (loading) {
      btn.disabled = true;
      if (text)   text.style.display   = 'none';
      if (loader) loader.style.display = 'inline-block';
    } else {
      btn.disabled = false;
      if (text)   text.style.display   = 'inline-flex';
      if (loader) loader.style.display = 'none';
    }
  }

  function showToast(message, type, duration) {
    type = type || 'info';
    duration = duration || 3000;

    var old = document.getElementById('aljanad-toast');
    if (old) old.remove();

    var colors = {
      info:    { bg: '#042e6f', icon: 'ℹ️' },
      success: { bg: '#10b981', icon: '✅' },
      error:   { bg: '#ef4444', icon: '❌' },
      warning: { bg: '#f59e0b', icon: '⚠️' }
    };
    var c = colors[type] || colors.info;

    var toast = document.createElement('div');
    toast.id = 'aljanad-toast';
    toast.style.cssText =
      'position:fixed;top:80px;left:50%;transform:translateX(-50%) translateY(-20px);' +
      'background:' + c.bg + ';color:#fff;padding:14px 24px;border-radius:12px;' +
      'box-shadow:0 10px 30px rgba(0,0,0,0.2);z-index:9999;' +
      'font-family:Cairo,sans-serif;font-weight:700;font-size:0.95rem;' +
      'opacity:0;transition:all 0.3s ease;max-width:90%;text-align:center;' +
      'display:flex;align-items:center;gap:10px;';
    toast.innerHTML = '<span style="font-size:1.2rem;">' + c.icon + '</span><span>' + message + '</span>';

    document.body.appendChild(toast);

    requestAnimationFrame(function () {
      toast.style.opacity = '1';
      toast.style.transform = 'translateX(-50%) translateY(0)';
    });

    setTimeout(function () {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(-50%) translateY(-20px)';
      setTimeout(function () { toast.remove(); }, 300);
    }, duration);
  }

  /* ==========================================================
     الاتصال بالخادم
     ========================================================== */

  function callBackend(action, payload) {
    if (!CONFIG.APPS_SCRIPT_URL ||
        CONFIG.APPS_SCRIPT_URL === 'YOUR_APPS_SCRIPT_WEB_APP_URL') {
      return Promise.reject(new Error(
        'لم يتم إعداد رابط الخادم بعد. راجع الإعدادات.'
      ));
    }

    var body = Object.assign({ action: action }, payload || {});

    return fetch(CONFIG.APPS_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(body),
      redirect: 'follow'
    })
    .then(function (res) {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.json();
    });
  }

  /* ==========================================================
     عمليات الطالب
     ========================================================== */

  function verifyAccessCode(code) {
    if (!validateAccessCode(code)) {
      return Promise.resolve({
        success: false,
        message: 'صيغة الكود غير صحيحة (HA1-XXXXXXXX)'
      });
    }

    return callBackend('verifyAccessCode', {
      code: code.trim().toUpperCase()
    });
  }

  function getStudentData(code) {
    return callBackend('getStudentData', { code: code });
  }

  function submitQuiz(data) {
    return callBackend('submitQuiz', data);
  }

  function ping() {
    return callBackend('ping');
  }

  /* ==========================================================
     تسجيل طالب جديد (عبر واتساب المشرف)
     ========================================================== */

  function submitRegistration(data) {
    return new Promise(function (resolve, reject) {
      try {
        var suggestedCode = generateAccessCode();
        var fullData = {
          platform: CONFIG.PLATFORM_NAME,
          submittedAt: new Date().toISOString(),
          suggestedCode: suggestedCode,
          student: {
            name:       data.name,
            studentId:  data.studentId || 'غير محدد',
            phone:      data.phone,
            college:    data.college,
            department: data.department,
            level:      data.level
          }
        };

        var encrypted = encryptData(fullData, CONFIG.SECRET_KEY);

        var message =
          '🔐 *طلب تسجيل جديد*\n' +
          '_الرجاء فك التشفير باستخدام أداة المشرف._\n\n' +
          '`' + encrypted + '`';

        var url = 'https://wa.me/' + CONFIG.ADMIN_WHATSAPP +
                  '?text=' + encodeURIComponent(message);

        window.open(url, '_blank');
        resolve({ success: true, suggestedCode: suggestedCode });
      } catch (err) {
        reject(err);
      }
    });
  }

  /* ==========================================================
     الجلسة (Session)
     ========================================================== */

  function saveSession(student) {
    try {
      var session = {
        accessCode: student.accessCode,
        studentId:  student.studentId,
        name:       student.name,
        phone:      student.phone,
        college:    student.college,
        department: student.department,
        level:      student.level,
        loginAt:    new Date().toISOString()
      };
      localStorage.setItem(CONFIG.SESSION_KEY, JSON.stringify(session));
      return true;
    } catch (e) {
      console.warn('تعذر حفظ الجلسة:', e);
      return false;
    }
  }

  function getSession() {
    try {
      var raw = localStorage.getItem(CONFIG.SESSION_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function clearSession() {
    try {
      localStorage.removeItem(CONFIG.SESSION_KEY);
    } catch (e) {
      console.warn('تعذر حذف الجلسة:', e);
    }
  }

  function isLoggedIn() {
    var s = getSession();
    return !!(s && s.accessCode && s.name);
  }

  function requireLogin(redirectTo) {
    if (!isLoggedIn()) {
      window.location.href = redirectTo || '/p/login.html';
      return false;
    }
    return true;
  }

  /* ==========================================================
     أدوات الترجمة
     ========================================================== */

  function translateCollege(code) {
    return CONFIG.COLLEGE_NAMES[code] || code || '—';
  }

  function translateDepartment(code) {
    return CONFIG.DEPARTMENT_NAMES[code] || code || '—';
  }

  function translateLevel(code) {
    return CONFIG.LEVEL_NAMES[String(code)] || code || '—';
  }

  /* ==========================================================
     تصدير API العام
     ========================================================== */

  global.AlJanadAPI = {
    CONFIG: CONFIG,

    // التشفير
    encryptData: encryptData,
    decryptData: decryptData,

    // التوليد
    generateAccessCode: generateAccessCode,

    // التحقق
    validatePhone:        validatePhone,
    validateRegistration: validateRegistration,
    validateAccessCode:   validateAccessCode,

    // الواجهة
    showErrors: showErrors,
    setLoading: setLoading,
    showToast:  showToast,

    // الطلبات
    callBackend:         callBackend,
    verifyAccessCode:    verifyAccessCode,
    getStudentData:      getStudentData,
    submitRegistration:  submitRegistration,
    submitQuiz:          submitQuiz,
    ping:                ping,

    // الجلسة
    saveSession:  saveSession,
    getSession:   getSession,
    clearSession: clearSession,
    isLoggedIn:   isLoggedIn,
    requireLogin: requireLogin,

    // الترجمة
    translateCollege:    translateCollege,
    translateDepartment: translateDepartment,
    translateLevel:      translateLevel
  };

})(window);
