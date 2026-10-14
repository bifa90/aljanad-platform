/* ============================================================
   منصة الجند التعليمية - منطق بوابة الطالب
   Student Portal Logic
   ============================================================ */

(function () {
  'use strict';

  /* ==========================================================
     1. التحقق من تسجيل الدخول
     ========================================================== */
  if (!window.AlJanadAPI) {
    console.error('❌ AlJanadAPI غير محمّلة');
    return;
  }

  var session = AlJanadAPI.getSession();
  if (!session || !session.name) {
    window.location.href = '/p/login.html';
    return;
  }

  /* ==========================================================
     2. الحالة العامة
     ========================================================== */
  var STATE = {
    student: session,
    courses: [],
    results: [],
    nextAction: null,
    stats: {
      courses: 0,
      lessons: 0,
      avgScore: 0,
      quizzes: 0
    }
  };

  /* ==========================================================
     3. الترحيب حسب الوقت
     ========================================================== */
  function getGreeting() {
    var hour = new Date().getHours();
    if (hour < 12) return 'صباح الخير';
    if (hour < 17) return 'مساء الخير';
    return 'مساء الخير';
  }

  function renderGreeting() {
    var greetingEl = document.getElementById('greeting');
    var subEl = document.getElementById('welcomeSub');
    if (!greetingEl) return;

    var firstName = (STATE.student.name || '').split(' ')[0];
    greetingEl.textContent = getGreeting() + '، ' + firstName + ' 👋';

    // رسالة تحفيزية متغيرة (Variable Reward)
    var messages = [
      'مستعد لجلسة تعلّم جديدة؟',
      'كل خطوة تقرّبك من هدفك.',
      'استمر، أنت تتقدم بشكل رائع.',
      'التعلم رحلة، ولنبدأ اليوم.',
      'النجاح يبدأ بخطوة صغيرة.',
      'هل تريد إكمال درس اليوم؟'
    ];
    subEl.textContent = messages[Math.floor(Math.random() * messages.length)];
  }

  /* ==========================================================
     4. سلسلة التعلم (Learning Streak)
     ========================================================== */
  function updateStreak() {
    var KEY = 'aljanad_streak';
    var today = new Date().toDateString();
    var streakData = { last: '', count: 0 };

    try {
      var raw = localStorage.getItem(KEY);
      if (raw) streakData = JSON.parse(raw);
    } catch (e) {}

    if (streakData.last === today) {
      // نفس اليوم، لا تحديث
    } else {
      var yesterday = new Date(Date.now() - 86400000).toDateString();
      if (streakData.last === yesterday) {
        streakData.count++;
      } else {
        streakData.count = 1;
      }
      streakData.last = today;
      try {
        localStorage.setItem(KEY, JSON.stringify(streakData));
      } catch (e) {}
    }

    var streakEl = document.getElementById('streakCount');
    if (streakEl) streakEl.textContent = streakData.count;
  }

  /* ==========================================================
     5. تعبئة بطاقة الطالب
     ========================================================== */
  function renderProfile() {
    var s = STATE.student;

    // الحرف الأول للصورة الرمزية
    var avatar = document.getElementById('profileAvatar');
    if (avatar) avatar.textContent = (s.name || '?').charAt(0);

    setText('profileName', s.name);
    setText('profileStudentId', s.studentId || '—');
    setText('profileDepartment', AlJanadAPI.translateDepartment(s.department));
    setText('profileLevel', AlJanadAPI.translateLevel(s.level));

    // كود الدخول (مخفي افتراضيًا)
    var codeEl = document.getElementById('profileCode');
    var codeToggle = document.getElementById('codeToggle');
    if (codeEl && s.accessCode) {
      codeEl.textContent = '••••••••';

      codeToggle.addEventListener('click', function () {
        if (codeEl.textContent === '••••••••') {
          codeEl.textContent = s.accessCode;
          codeToggle.textContent = '🙈';
        } else {
          codeEl.textContent = '••••••••';
          codeToggle.textContent = '👁️';
        }
      });
    }
  }

  /* ==========================================================
     6. المقررات: جلب وعرض
     ========================================================== */
  function loadCourses() {
    var s = STATE.student;

    // في هذه المرحلة، نستخدم بيانات وهمية (Mock) حتى يتم إعداد ورقة Courses
    // لاحقًا: استبدلها بـ AlJanadAPI.callBackend('getCourses', {...})
    var mockCourses = [
      {
        id: 'HA101',
        title: 'تاريخ عمارة 1',
        description: 'مدخل إلى تاريخ العمارة العالمية من الحضارات القديمة حتى العصور الوسطى.',
        icon: '🏛️',
        department: 'ARCH',
        level: '1',
        totalLessons: 12,
        completedLessons: 4
      },
      {
        id: 'HA102',
        title: 'مبادئ التصميم المعماري',
        description: 'أساسيات التصميم، النسب، والتناسب في العمارة الحديثة.',
        icon: '📐',
        department: 'ARCH',
        level: '1',
        totalLessons: 10,
        completedLessons: 10
      },
      {
        id: 'INT201',
        title: 'التصميم الداخلي',
        description: 'دراسة تحليلية للعناصر الداخلية والمواد والمساحات.',
        icon: '🎨',
        department: 'CIVIL',
        level: '1',
        totalLessons: 8,
        completedLessons: 0
      }
    ];

    STATE.courses = mockCourses.filter(function (c) {
      return c.department === s.department && String(c.level) === String(s.level);
    });

    renderCourses();
    calculateStats();
    updateGlobalProgress();
    determineNextAction();
  }

  function renderCourses() {
    var grid = document.getElementById('coursesGrid');
    if (!grid) return;

    if (STATE.courses.length === 0) {
      grid.innerHTML =
        '<div class="empty-state">' +
        '  <div class="empty-state-icon">📚</div>' +
        '  <h3>لا توجد مقررات بعد</h3>' +
        '  <p>سيتم إضافة المقررات الخاصة بقسمك ومستواك قريبًا.</p>' +
        '</div>';
      return;
    }

    var html = STATE.courses.map(function (course) {
      var progress = course.totalLessons > 0
        ? Math.round((course.completedLessons / course.totalLessons) * 100)
        : 0;

      var badge = '';
      if (progress >= 100) {
        badge = '<span class="course-badge badge-done">✅ مكتمل</span>';
      } else if (progress === 0) {
        badge = '<span class="course-badge badge-new">🆕 جديد</span>';
      } else {
        badge = '<span class="course-badge badge-progress">⏳ قيد التقدم</span>';
      }

      return '' +
        '<article class="course-card">' +
        '  <div class="course-cover">' +
        '    ' + badge +
        '    <span>' + (course.icon || '📘') + '</span>' +
        '  </div>' +
        '  <div class="course-body">' +
        '    <h3>' + escapeHtml(course.title) + '</h3>' +
        '    <p>' + escapeHtml(course.description) + '</p>' +
        '    <div class="course-progress">' +
        '      <div class="course-progress-bar">' +
        '        <div class="course-progress-fill" style="width:' + progress + '%"></div>' +
        '      </div>' +
        '      <div class="course-progress-text">' +
        '        <span>' + course.completedLessons + ' من ' + course.totalLessons + ' درس</span>' +
        '        <span>' + progress + '%</span>' +
        '      </div>' +
        '    </div>' +
        '    <a class="course-link" href="/p/lesson.html?id=' + course.id + '">' +
        '      <span>' + (progress === 0 ? 'ابدأ المقرر' : progress >= 100 ? 'مراجعة' : 'أكمل') + '</span>' +
        '      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">' +
        '        <path d="M19 12H5M12 19l-7-7 7-7"/>' +
        '      </svg>' +
        '    </a>' +
        '  </div>' +
        '</article>';
    }).join('');

    grid.innerHTML = html;
  }

  /* ==========================================================
     7. الإحصائيات
     ========================================================== */
  function calculateStats() {
    var s = STATE.stats;

    s.courses = STATE.courses.length;

    s.lessons = STATE.courses.reduce(function (sum, c) {
      return sum + (c.completedLessons || 0);
    }, 0);

    // من النتائج (سيتم جلبها لاحقًا)
    s.quizzes = STATE.results.length;

    if (STATE.results.length > 0) {
      var total = STATE.results.reduce(function (sum, r) {
        return sum + (parseFloat(r.score) || 0);
      }, 0);
      s.avgScore = Math.round(total / STATE.results.length) + '%';
    } else {
      s.avgScore = '—';
    }

    setText('statCourses', s.courses);
    setText('statLessons', s.lessons);
    setText('statScore', s.avgScore);
    setText('statQuizzes', s.quizzes);
  }

  /* ==========================================================
     8. شريط التقدم العام
     ========================================================== */
  function updateGlobalProgress() {
    var totalLessons = STATE.courses.reduce(function (sum, c) {
      return sum + (c.totalLessons || 0);
    }, 0);

    var totalCompleted = STATE.courses.reduce(function (sum, c) {
      return sum + (c.completedLessons || 0);
    }, 0);

    var pct = totalLessons > 0
      ? Math.round((totalCompleted / totalLessons) * 100)
      : 0;

    var fill = document.getElementById('globalProgressFill');
    if (fill) fill.style.width = pct + '%';
  }

  /* ==========================================================
     9. الإجراء التالي (Next Action)
     ========================================================== */
  function determineNextAction() {
    // ابحث عن أول مقرر قيد التقدم (لم يكتمل)
    var inProgress = STATE.courses.find(function (c) {
      return c.completedLessons > 0 && c.completedLessons < c.totalLessons;
    });

    // إن لم يوجد، ابحث عن مقرر لم يبدأ
    if (!inProgress) {
      inProgress = STATE.courses.find(function (c) {
        return c.completedLessons === 0;
      });
    }

    if (!inProgress) {
      // كل المقررات مكتملة
      return;
    }

    STATE.nextAction = {
      course: inProgress,
      lessonNumber: inProgress.completedLessons + 1
    };

    renderNextAction();
  }

  function renderNextAction() {
    if (!STATE.nextAction) return;

    var wrapper = document.getElementById('nextActionWrapper');
    var courseEl = document.getElementById('nextActionCourse');
    var lessonEl = document.getElementById('nextActionLesson');
    var btn = document.getElementById('nextActionBtn');

    if (!wrapper) return;

    courseEl.textContent = STATE.nextAction.course.title;
    lessonEl.textContent = 'الدرس ' + STATE.nextAction.lessonNumber +
                           ' من ' + STATE.nextAction.course.totalLessons;
    btn.href = '/p/lesson.html?id=' + STATE.nextAction.course.id;

    wrapper.style.display = 'block';
  }

  /* ==========================================================
     10. النتائج (مؤقتًا وهمية)
     ========================================================== */
  function loadResults() {
    // لاحقًا: AlJanadAPI.callBackend('getStudentResults', {...})
    STATE.results = [];
    renderResults();
  }

  function renderResults() {
    var list = document.getElementById('resultsList');
    if (!list) return;

    if (STATE.results.length === 0) {
      list.innerHTML =
        '<div class="empty-state">' +
        '  <div class="empty-state-icon">📊</div>' +
        '  <h3>لا توجد نتائج بعد</h3>' +
        '  <p>ستظهر نتائج اختباراتك هنا بعد أول اختبار.</p>' +
        '</div>';
      return;
    }

    // سيتم التعبئة لاحقًا عند إضافة النتائج الحقيقية
  }

  /* ==========================================================
     11. أدوات مساعدة
     ========================================================== */
  function setText(id, value) {
    var el = document.getElementById(id);
    if (el) el.textContent = value;
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /* ==========================================================
     12. تسجيل الخروج
     ========================================================== */
  function setupLogout() {
    var btn = document.getElementById('logoutBtn');
    if (!btn) return;

    btn.addEventListener('click', function () {
      if (confirm('هل تريد تسجيل الخروج؟')) {
        AlJanadAPI.clearSession();
        window.location.href = '/p/login.html';
      }
    });
  }

  /* ==========================================================
     13. التشغيل
     ========================================================== */
  function init() {
    renderGreeting();
    updateStreak();
    renderProfile();
    loadCourses();
    loadResults();
    setupLogout();

    console.log('✅ بوابة الطالب — جاهزة');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
