/* ============================================================
   منصة الجند التعليمية - طبقة API
   Al-Janad Educational Platform - API Layer
   ============================================================ */

(function (global) {
  'use strict';

  // ===== الإعدادات =====
  var CONFIG = {
    // رقم واتساب المشرف (بصيغة دولية بدون +)
    ADMIN_WHATSAPP: '967777410332',

    // مفتاح التشفير — يجب أن يطابق أداة فك التشفير عند المشرف
    SECRET_KEY: 'ALJANAD2026',

    // اسم المنصة
    PLATFORM_NAME: 'منصة الجند التعليمية',

    // رابط Apps Script (سيُستخدم لاحقًا عند تفعيل الخادم)
    APPS_SCRIPT_URL: '',

    // خريطة أسماء الكليات والأقسام
    COLLEGE_NAMES: {
      'ENG': 'كلية الهندسة وتقنية المعلومات'
    },
    DEPARTMENT_NAMES: {
      'ARCH': 'قسم الهندسة المعمارية',
      'CIVIL': 'قسم التصميم الداخلي'
    },
    LEVEL_NAMES: {
      '1': 'المستوى الأول',
      '2': 'المستوى الثاني',
      '3': 'المستوى الثالث',
      '4': 'المستوى الرابع'
    }
  };

  // ===== أدوات التشفير =====

  /**
   * تشفير كائن JSON بـ XOR + Base64
   * @param {Object} obj - الكائن المراد تشفيره
   * @param {string} key - مفتاح التشفير
   * @returns {string} - نص مُشفّر بصيغة Base64
   */
  function encryptData(obj, key) {
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

  /**
   * فك تشفير نص Base64 (للمشرف)
   * @param {string} b64 - النص المُشفّر
   * @param {string} key - مفتاح التشفير
   * @returns {Object} - الكائن الأصلي
   */
  function decryptData(b64, key) {
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

  // ===== توليد الأكواد =====

  /**
   * توليد كود دخول مقترح (الشكل: HA1-XXXXXXXX)
   * @returns {string}
   */
  function generateAccessCode() {
    var chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    var code = 'HA1-';
    for (var i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  // ===== التحقق من الصحة =====

  /**
   * التحقق من صحة بيانات التسجيل
   * @param {Object} data
   * @returns {{valid: boolean, errors: Object}}
   */
  function validateRegistration(data) {
    var errors = {};
    var valid = true;

    if (!data.name || data.name.trim().length < 3) {
      errors.name = 'الاسم يجب أن يكون 3 أحرف على الأقل';
      valid = false;
    }

    // الرقم الجامعي اختياري — لا تحقق

    if (!data.phone || !/^[0-9]{9,12}$/.test(data.phone.replace(/\s/g, ''))) {
      errors.phone = 'رقم الهاتف غير صحيح (9 إلى 12 رقمًا)';
      valid = false;
    }

    if (!data.college)    { errors.college = 'اختر الكلية';   valid = false; }
    if (!data.department) { errors.dept = 'اختر القسم';       valid = false; }
    if (!data.level)      { errors.level = 'اختر المستوى';    valid = false; }

    return { valid: valid, errors: errors };
  }

  /**
   * عرض الأخطاء في الحقول
   * @param {Object} errors
   */
  function showErrors(errors) {
    // تنظيف كل الأخطاء السابقة
    document.querySelectorAll('.error-msg').forEach(function (el) {
      el.textContent = '';
    });
    document.querySelectorAll('.form-group input, .form-group select').forEach(function (el) {
      el.classList.remove('error');
    });

    // عرض الأخطاء الجديدة
    if (errors.name) {
      setError('nameError', 'studentName', errors.name);
    }
    if (errors.phone) {
      setError('phoneError', 'studentPhone', errors.phone);
    }
    if (errors.college) {
      setError('collegeError', 'college', errors.college);
    }
    if (errors.dept) {
      setError('deptError', 'department', errors.dept);
    }
    if (errors.level) {
      setError('levelError', 'level', errors.level);
    }
  }

  function setError(errorId, inputId, message) {
    var errEl = document.getElementById(errorId);
    var inputEl = document.getElementById(inputId);
    if (errEl) errEl.textContent = message;
    if (inputEl) inputEl.classList.add('error');
  }

  // ===== حالة التحميل =====

  /**
   * تفعيل/تعطيل حالة التحميل على زر الإرسال
   * @param {boolean} loading
   */
  function setLoading(loading) {
    var btn = document.getElementById('submitBtn');
    var text = document.getElementById('btnText');
    var loader = document.getElementById('btnLoader');

    if (!btn) return;

    if (loading) {
      btn.disabled = true;
      if (text) text.style.display = 'none';
      if (loader) loader.style.display = 'block';
    } else {
      btn.disabled = false;
      if (text) text.style.display = 'inline';
      if (loader) loader.style.display = 'none';
    }
  }

  // ===== إرسال التسجيل =====

  /**
   * إرسال بيانات التسجيل عبر واتساب (مُشفَّرة)
   * @param {Object} data - بيانات الطالب
   * @returns {Promise}
   */
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

  // ===== إرسال إلى Apps Script (للمستقبل) =====

  /**
   * إرسال طلب POST إلى Apps Script
   * @param {Object} payload
   * @returns {Promise<Object>}
   */
  function callBackend(payload) {
    if (!CONFIG.APPS_SCRIPT_URL) {
      return Promise.reject(new Error('لم يتم إعداد رابط الخادم بعد'));
    }

    return fetch(CONFIG.APPS_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
      redirect: 'follow'
    }).then(function (res) {
      return res.json();
    });
  }

  // ===== الحفظ في المتصفح =====

  /**
   * حفظ بيانات الطالب في localStorage
   */
  function saveSession(data) {
    try {
      localStorage.setItem('aljanad_session', JSON.stringify({
        accessCode: data.accessCode,
        studentId:  data.studentId,
        name:       data.name,
        level:      data.level,
        department: data.department,
        loginAt:    new Date().toISOString()
      }));
    } catch (e) {
      console.warn('تعذر حفظ الجلسة:', e);
    }
  }

  /**
   * قراءة بيانات الجلسة من localStorage
   */
  function getSession() {
    try {
      var raw = localStorage.getItem('aljanad_session');
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  /**
   * حذف الجلسة
   */
  function clearSession() {
    try {
      localStorage.removeItem('aljanad_session');
    } catch (e) {
      console.warn('تعذر حذف الجلسة:', e);
    }
  }

  // ===== تصدير API العام =====
  global.AlJanadAPI = {
    // الإعدادات
    CONFIG: CONFIG,

    // التشفير
    encryptData:  encryptData,
    decryptData:  decryptData,

    // التوليد
    generateAccessCode: generateAccessCode,

    // التحقق
    validateRegistration: validateRegistration,
    showErrors:           showErrors,

    // الواجهة
    setLoading: setLoading,

    // الطلبات
    submitRegistration: submitRegistration,
    callBackend:        callBackend,

    // الجلسة
    saveSession:  saveSession,
    getSession:   getSession,
    clearSession: clearSession
  };

})(window);
