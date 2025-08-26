import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Translation resources
const resources = {
  en: {
    translation: {
      // Navigation
      "nav.home": "Home",
      "nav.stories": "Stories",
      "nav.profile": "Profile",
      "nav.settings": "Settings",
      "nav.logout": "Logout",
      
      // Landing Page
      "landing.title": "StoryBridge",
      "landing.subtitle": "Interactive audio stories that make learning fun for children aged 4-10",
      "landing.offline_badge": "✓ Works 100% offline after download",
      "landing.get_started": "Get Started",
      "landing.join_message": "Join thousands of children learning through stories",
      "landing.how_to_use": "How to Use StoryBridge",
      "landing.language_support": "Arabic & English Support",
      
      // How to Use Guides
      "guide.end_user.title": "For Students, Parents & Teachers",
      "guide.end_user.step1": "Browse story library and choose age-appropriate stories",
      "guide.end_user.step2": "Listen to interactive audio stories with voice narration",
      "guide.end_user.step3": "Complete quizzes and learn new vocabulary words",
      "guide.end_user.step4": "Earn coins and badges for story completion",
      "guide.end_user.step5": "Download stories for offline learning anywhere",
      
      "guide.creator.title": "For Story Creators",
      "guide.creator.step1": "Sign up as a Story Creator and verify your account",
      "guide.creator.step2": "Write engaging stories following TPRS methodology",
      "guide.creator.step3": "Add 3-5 vocabulary words repeated 3+ times in your story",
      "guide.creator.step4": "Create interactive quizzes (true/false, multiple choice)",
      "guide.creator.step5": "Submit for admin review and await publication",
      
      "guide.narrator.title": "For Voice Narrators", 
      "guide.narrator.step1": "Register as a Voice Narrator with audio experience",
      "guide.narrator.step2": "Browse published stories that need narration",
      "guide.narrator.step3": "Record high-quality audio or upload audio files",
      "guide.narrator.step4": "Use voice-to-text features for script creation",
      "guide.narrator.step5": "Submit narrations for admin approval",
      
      // PWA Installation
      "pwa.title": "Install StoryBridge App",
      "pwa.subtitle": "Get the full app experience on your device",
      "pwa.android": "Android (Chrome)",
      "pwa.android.step1": "Open StoryBridge in Chrome browser",
      "pwa.android.step2": "Tap the menu (⋮) in top right corner",
      "pwa.android.step3": "Select 'Add to Home screen'",
      "pwa.android.step4": "Tap 'Install' when prompted",
      "pwa.android.step5": "Find StoryBridge icon on your home screen",
      "pwa.ios": "iOS (Safari)",
      "pwa.ios.step1": "Open StoryBridge in Safari browser",
      "pwa.ios.step2": "Tap the share button (□↑) at the bottom",
      "pwa.ios.step3": "Scroll down and tap 'Add to Home Screen'",
      "pwa.ios.step4": "Tap 'Add' to confirm installation",
      "pwa.ios.step5": "Launch from your home screen icon",
      
      // FAQ
      "faq.title": "Frequently Asked Questions",
      "faq.offline.q": "How does StoryBridge work offline?",
      "faq.offline.a": "Once you download stories to your device, you can access them completely offline. Your progress, coins, and badges are saved locally and sync when you reconnect to the internet.",
      "faq.tprs.q": "What is TPRS methodology?",
      "faq.tprs.a": "Teaching Proficiency through Reading and Storytelling (TPRS) uses compelling stories with repetitive vocabulary to help children naturally acquire language skills through context and engagement.",
      "faq.rewards.q": "How do I earn coins and badges?", 
      "faq.rewards.a": "You earn 10 coins for each completed story and 5 coins for each correct quiz answer. Badges are awarded for milestones like completing your first story (Story Starter) or learning 10 words (Word Wizard).",
      "faq.languages.q": "Can I use StoryBridge in different languages?",
      "faq.languages.a": "Yes! StoryBridge supports English and Arabic with full RTL (right-to-left) layout support. Stories are available in both languages for multilingual learning.",
      "faq.roles.q": "How do I become a Story Creator or Narrator?",
      "faq.roles.a": "Simply sign up with the Creator or Narrator role. Creators can write and submit stories, while Narrators add voice recordings to bring stories to life. All content goes through admin review.",
      "faq.accessibility.q": "Is StoryBridge suitable for children with learning disabilities?",
      "faq.accessibility.a": "Yes! StoryBridge follows WCAG 2.1 accessibility guidelines with screen reader support, audio cues, large touch targets, and simple navigation designed for children with diverse needs.",
      "faq.ngo.q": "How can NGOs partner with StoryBridge?",
      "faq.ngo.a": "NGOs can access free platform usage, co-branded materials, priority support, and detailed analytics reports. Contact us through the partnership section in Settings for more information.",
      
      // Features
      "feature.interactive_stories.title": "Interactive Stories",
      "feature.interactive_stories.desc": "Audio-driven stories with engaging quizzes and vocabulary",
      "feature.earn_rewards.title": "Earn Rewards", 
      "feature.earn_rewards.desc": "Collect coins and badges for completing stories",
      "feature.offline_learning.title": "Offline Learning",
      "feature.offline_learning.desc": "Learn anywhere, anytime - no internet required",
      
      // Authentication
      "auth.welcome_back": "Welcome Back",
      "auth.join_storybridge": "Join StoryBridge",
      "auth.email": "Email",
      "auth.password": "Password",
      "auth.role": "I am a...",
      "auth.role.end_user": "Student/Parent/Teacher",
      "auth.role.creator": "Story Creator", 
      "auth.role.narrator": "Voice Narrator",
      "auth.role.admin": "Administrator",
      "auth.sign_in": "Sign In",
      "auth.sign_up": "Create Account",
      "auth.create_account": "Create Account",
      "auth.no_account": "Don't have an account? Sign up",
      "auth.have_account": "Already have an account? Sign in",
      "auth.please_wait": "Please wait...",
      "auth.select_role": "Select your role",
      "auth.auth_code": "Authentication Code",
      "auth.enter_6digit": "Enter 6-digit code",
      "auth.verify_code": "Verify Code",
      "auth.mfa_required": "MFA Required",
      "auth.enter_code": "Please enter your authentication code",
      "auth.signin_success": "Successfully signed in. Redirecting...",
      "auth.account_created": "Account Created!",
      "auth.welcome_message": "Welcome to StoryBridge! Redirecting...",
      "auth.signin_failed": "Sign In Failed",
      "auth.signup_failed": "Sign Up Failed",
      
      // Status and Errors
      "status.offline": "Offline Mode",
      "error.connection_required": "Connection Required", 
      "error.need_internet": "You need an internet connection to create an account",
      "error.general": "Something went wrong. Please try again.",
      
      // Dashboard
      "dashboard.story_library": "Story Library",
      "dashboard.choose_story": "Choose a story to begin your adventure!",
      "dashboard.creator_dashboard": "Creator Dashboard",
      "dashboard.manage_stories": "Manage your stories and create new ones",
      "dashboard.narrator_dashboard": "Narrator Dashboard", 
      "dashboard.add_voice": "Add your voice to stories and bring them to life",
      "dashboard.admin_dashboard": "Admin Dashboard",
      "dashboard.manage_content": "Review and manage platform content",
      
      // Stories
      "stories.age_filter": "Filter by age",
      "stories.all_ages": "All Ages",
      "stories.ages_4_6": "Ages 4-6",
      "stories.ages_7_10": "Ages 7-10", 
      "stories.completed": "Completed",
      "stories.start_story": "Start Story",
      "stories.play_again": "Play Again",
      "stories.create_new": "Create New Story",
      "stories.story_title": "Story Title",
      "stories.age_group": "Age Group",
      "stories.story_text": "Story Text",
      "stories.vocabulary": "Vocabulary Words (comma-separated)",
      "stories.quizzes": "Quiz Questions (JSON format)",
      "stories.create_story": "Create Story",
      "stories.cancel": "Cancel",
      
      // Story Player
      "player.new_words": "New Words in This Story",
      "player.question_x_of_y": "Question {{current}} of {{total}}",
      "player.true": "True",
      "player.false": "False", 
      "player.type_answer": "Type your answer...",
      "player.submit_answer": "Submit Answer",
      
      // Narration
      "narration.stories_to_narrate": "Stories to Narrate",
      "narration.my_narrations": "My Narrations", 
      "narration.already_narrated": "Already Narrated",
      "narration.select_to_narrate": "Select to Narrate",
      "narration.narrated": "Narrated",
      "narration.add_narration_for": "Add Narration for: {{title}}",
      "narration.story_text_to_narrate": "Story Text to Narrate:",
      "narration.upload_audio": "Upload Audio File",
      "narration.voice_to_text": "Voice-to-Text",
      "narration.start_recording": "Start Recording",
      "narration.recording": "Recording...",
      "narration.type_narration": "Or type the narration text here...",
      "narration.submit_narration": "Submit Narration",
      
      // Progress & Rewards
      "progress.coins": "Coins",
      "progress.badges": "Badges", 
      "progress.story_completed": "Story Completed! 🎉",
      "progress.earned_coins": "You earned {{coins}} coins!",
      "progress.new_badge": "New Badge Earned! 🏆",
      "progress.story_starter": "Story Starter",
      "progress.word_wizard": "Word Wizard", 
      "progress.quiz_master": "Quiz Master",
      "progress.show_teacher": "Show My Teacher",
      
      // Admin
      "admin.pending_content": "Pending Content",
      "admin.approve": "Approve",
      "admin.reject": "Reject",
      "admin.review_notes": "Review Notes",
      "admin.users": "Users",
      "admin.analytics": "Analytics",
      
      // Analytics
      "analytics.active_users": "Active Users",
      "analytics.stories_completed": "Stories Completed", 
      "analytics.avg_session_time": "Average Session Time",
      "analytics.vocab_retention": "Vocabulary Retention", 
      "analytics.quiz_success_rate": "Quiz Success Rate",
      "analytics.export_csv": "Export CSV",
      
      // Settings
      "settings.language": "Language",
      "settings.storage_management": "Storage Management", 
      "settings.reset_progress": "Reset Progress",
      "settings.bluetooth_sharing": "Bluetooth Sharing",
      "settings.ngo_partnership": "NGO Partnership Info",
      
      // Status
      "status.draft": "Draft",
      "status.pending": "Pending", 
      "status.published": "Published",
      "status.rejected": "Rejected",
      
      // Actions
      "action.edit": "Edit",
      "action.delete": "Delete",
      "action.save": "Save", 
      "action.submit": "Submit",
      "action.loading": "Loading...",
      
      // Messages
      "message.story_created": "Story created!",
      "message.story_submitted": "Your story has been submitted for review.",
      "message.narration_submitted": "Your narration has been added to the story.",
      "message.progress_synced": "Progress synced successfully",
      "message.offline_mode": "You are currently offline. Some features may be limited.",
      "message.sync_complete": "Data synchronized successfully",
      
      // Errors
      "error.general": "Something went wrong",
      "error.network": "Network error. Please check your connection.",
      "error.file_too_large": "File size must be less than 5MB",
      "error.invalid_file_type": "Invalid file type",
      "error.tprs_validation": "TPRS validation failed"
    }
  },
  ar: {
    translation: {
      // Navigation 
      "nav.home": "الرئيسية",
      "nav.stories": "القصص", 
      "nav.profile": "الملف الشخصي",
      "nav.settings": "الإعدادات",
      "nav.logout": "تسجيل الخروج",
      
      // Landing Page
      "landing.title": "جسر القصص", 
      "landing.subtitle": "قصص صوتية تفاعلية تجعل التعلم ممتعًا للأطفال من سن 4-10 سنوات",
      "landing.offline_badge": "✓ يعمل بدون إنترنت 100% بعد التحميل",
      "landing.get_started": "ابدأ الآن",
      "landing.join_message": "انضم إلى آلاف الأطفال الذين يتعلمون من خلال القصص",
      "landing.how_to_use": "كيفية استخدام جسر القصص",
      "landing.language_support": "دعم العربية والإنجليزية",
      
      // How to Use Guides  
      "guide.end_user.title": "للطلاب والآباء والمعلمين",
      "guide.end_user.step1": "تصفح مكتبة القصص واختر القصص المناسبة للعمر",
      "guide.end_user.step2": "استمع إلى القصص الصوتية التفاعلية مع الرواية الصوتية",
      "guide.end_user.step3": "أكمل الاختبارات وتعلم كلمات مفردات جديدة",
      "guide.end_user.step4": "اكسب العملات والشارات لإكمال القصص",
      "guide.end_user.step5": "حمل القصص للتعلم بدون إنترنت في أي مكان",
      
      "guide.creator.title": "لمنشئي القصص",
      "guide.creator.step1": "سجل كمنشئ قصص وتحقق من حسابك",
      "guide.creator.step2": "اكتب قصصًا جذابة باتباع منهجية TPRS",
      "guide.creator.step3": "أضف 3-5 كلمات مفردات تتكرر 3+ مرات في قصتك",
      "guide.creator.step4": "أنشئ اختبارات تفاعلية (صحيح/خطأ، اختيار متعدد)",
      "guide.creator.step5": "أرسل للمراجعة الإدارية وانتظر النشر",
      
      "guide.narrator.title": "للرواة الصوتيين",
      "guide.narrator.step1": "سجل كراوٍ صوتي مع خبرة صوتية",
      "guide.narrator.step2": "تصفح القصص المنشورة التي تحتاج رواية",
      "guide.narrator.step3": "سجل صوتًا عالي الجودة أو ارفع ملفات صوتية",
      "guide.narrator.step4": "استخدم ميزات تحويل الصوت إلى نص لإنشاء النص",
      "guide.narrator.step5": "أرسل الروايات لموافقة الإدارة",
      
      // PWA Installation
      "pwa.title": "تثبيت تطبيق جسر القصص",
      "pwa.subtitle": "احصل على تجربة التطبيق الكاملة على جهازك",
      "pwa.android": "أندرويد (كروم)",
      "pwa.android.step1": "افتح جسر القصص في متصفح كروم",
      "pwa.android.step2": "اضغط على القائمة (⋮) في الزاوية اليمنى العلوية",
      "pwa.android.step3": "حدد 'إضافة إلى الشاشة الرئيسية'",
      "pwa.android.step4": "اضغط 'تثبيت' عند المطالبة",
      "pwa.android.step5": "ابحث عن أيقونة جسر القصص على شاشتك الرئيسية",
      "pwa.ios": "آي أو إس (سفاري)",
      "pwa.ios.step1": "افتح جسر القصص في متصفح سفاري",
      "pwa.ios.step2": "اضغط على زر المشاركة (□↑) في الأسفل",
      "pwa.ios.step3": "مرر لأسفل واضغط 'إضافة إلى الشاشة الرئيسية'",
      "pwa.ios.step4": "اضغط 'إضافة' لتأكيد التثبيت",
      "pwa.ios.step5": "شغل من أيقونة شاشتك الرئيسية",
      
      // FAQ
      "faq.title": "الأسئلة الشائعة",
      "faq.offline.q": "كيف يعمل جسر القصص بدون إنترنت؟",
      "faq.offline.a": "بمجرد تحميل القصص على جهازك، يمكنك الوصول إليها بالكامل بدون إنترنت. يتم حفظ تقدمك والعملات والشارات محليًا ومزامنتها عند إعادة الاتصال بالإنترنت.",
      "faq.tprs.q": "ما هي منهجية TPRS؟",
      "faq.tprs.a": "التدريس للكفاءة من خلال القراءة والحكي (TPRS) يستخدم قصصًا جذابة مع مفردات متكررة لمساعدة الأطفال على اكتساب مهارات اللغة بشكل طبيعي من خلال السياق والمشاركة.",
      "faq.rewards.q": "كيف أكسب العملات والشارات؟",
      "faq.rewards.a": "تكسب 10 عملات لكل قصة مكتملة و5 عملات لكل إجابة صحيحة في الاختبار. تُمنح الشارات للإنجازات مثل إكمال قصتك الأولى (بادئ القصص) أو تعلم 10 كلمات (ساحر الكلمات).",
      "faq.languages.q": "هل يمكنني استخدام جسر القصص بلغات مختلفة؟",
      "faq.languages.a": "نعم! يدعم جسر القصص الإنجليزية والعربية مع دعم كامل لتخطيط RTL (من اليمين إلى اليسار). القصص متوفرة بكلا اللغتين للتعلم متعدد اللغات.",
      "faq.roles.q": "كيف أصبح منشئ قصص أو راوٍ؟",
      "faq.roles.a": "ببساطة سجل بدور منشئ القصص أو الراوي. يمكن لمنشئي القصص كتابة وإرسال القصص، بينما يضيف الرواة التسجيلات الصوتية لإحياء القصص. كل المحتوى يمر بمراجعة إدارية.",
      "faq.accessibility.q": "هل جسر القصص مناسب للأطفال ذوي صعوبات التعلم؟",
      "faq.accessibility.a": "نعم! يتبع جسر القصص إرشادات إمكانية الوصول WCAG 2.1 مع دعم قارئ الشاشة، والإشارات الصوتية، وأهداف اللمس الكبيرة، والتنقل البسيط المصمم للأطفال ذوي الاحتياجات المتنوعة.",
      "faq.ngo.q": "كيف يمكن للمنظمات غير الحكومية الشراكة مع جسر القصص؟",
      "faq.ngo.a": "يمكن للمنظمات غير الحكومية الوصول إلى الاستخدام المجاني للمنصة، والمواد ذات العلامة التجارية المشتركة، والدعم ذي الأولوية، وتقارير التحليلات المفصلة. تواصل معنا من خلال قسم الشراكة في الإعدادات للمزيد من المعلومات.",
      
      // Features
      "feature.interactive_stories.title": "قصص تفاعلية",
      "feature.interactive_stories.desc": "قصص صوتية مع اختبارات ومفردات جذابة",
      "feature.earn_rewards.title": "اكسب المكافآت",
      "feature.earn_rewards.desc": "اجمع العملات والشارات لإكمال القصص",
      "feature.offline_learning.title": "التعلم بدون إنترنت",
      "feature.offline_learning.desc": "تعلم في أي مكان وأي وقت - لا يتطلب إنترنت",
      
      // Authentication
      "auth.welcome_back": "مرحبًا بعودتك",
      "auth.join_storybridge": "انضم إلى جسر القصص",
      "auth.email": "البريد الإلكتروني",
      "auth.password": "كلمة المرور", 
      "auth.role": "أنا...",
      "auth.role.end_user": "طالب/والد/معلم",
      "auth.role.creator": "منشئ قصص",
      "auth.role.narrator": "راوي صوتي", 
      "auth.role.admin": "مدير",
      "auth.sign_in": "تسجيل الدخول",
      "auth.sign_up": "إنشاء حساب",
      "auth.create_account": "إنشاء حساب",
      "auth.no_account": "ليس لديك حساب؟",
      "auth.have_account": "لديك حساب بالفعل؟",
      "auth.please_wait": "يرجى الانتظار...",
      
      // Dashboard 
      "dashboard.story_library": "مكتبة القصص",
      "dashboard.choose_story": "اختر قصة لبدء مغامرتك!",
      "dashboard.creator_dashboard": "لوحة منشئ القصص",
      "dashboard.manage_stories": "أدر قصصك وأنشئ قصصًا جديدة",
      "dashboard.narrator_dashboard": "لوحة الراوي",
      "dashboard.add_voice": "أضف صوتك للقصص وأحيها",
      "dashboard.admin_dashboard": "لوحة الإدارة",
      "dashboard.manage_content": "راجع وأدر محتوى المنصة",
      
      // Stories
      "stories.age_filter": "تصفية حسب العمر",
      "stories.all_ages": "جميع الأعمار",
      "stories.ages_4_6": "من 4-6 سنوات", 
      "stories.ages_7_10": "من 7-10 سنوات",
      "stories.completed": "مكتملة",
      "stories.start_story": "ابدأ القصة",
      "stories.play_again": "العب مرة أخرى",
      "stories.create_new": "إنشاء قصة جديدة",
      "stories.story_title": "عنوان القصة",
      "stories.age_group": "الفئة العمرية",
      "stories.story_text": "نص القصة",
      "stories.vocabulary": "كلمات المفردات (مفصولة بفواصل)",
      "stories.quizzes": "أسئلة الاختبار (تنسيق JSON)",
      "stories.create_story": "إنشاء قصة",
      "stories.cancel": "إلغاء",
      
      // Story Player
      "player.new_words": "كلمات جديدة في هذه القصة",
      "player.question_x_of_y": "السؤال {{current}} من {{total}}",
      "player.true": "صحيح",
      "player.false": "خطأ",
      "player.type_answer": "اكتب إجابتك...",
      "player.submit_answer": "إرسال الإجابة",
      
      // Progress & Rewards
      "progress.coins": "العملات",
      "progress.badges": "الشارات",
      "progress.story_completed": "تم إكمال القصة! 🎉", 
      "progress.earned_coins": "لقد حصلت على {{coins}} عملة!",
      "progress.new_badge": "شارة جديدة! 🏆",
      "progress.story_starter": "بادئ القصص",
      "progress.word_wizard": "ساحر الكلمات",
      "progress.quiz_master": "خبير الاختبارات",
      "progress.show_teacher": "أظهر للمعلم",
      
      // Messages  
      "message.story_created": "تم إنشاء القصة!",
      "message.story_submitted": "تم إرسال قصتك للمراجعة.",
      "message.narration_submitted": "تم إضافة روايتك للقصة.",
      "message.progress_synced": "تم مزامنة التقدم بنجاح",
      "message.offline_mode": "أنت حاليًا غير متصل. قد تكون بعض الميزات محدودة.",
      "message.sync_complete": "تم مزامنة البيانات بنجاح",
      
      // Status
      "status.draft": "مسودة",
      "status.pending": "قيد الانتظار",
      "status.published": "منشورة", 
      "status.rejected": "مرفوضة",
      
      // Actions
      "action.edit": "تعديل",
      "action.delete": "حذف",
      "action.save": "حفظ",
      "action.submit": "إرسال", 
      "action.loading": "جار التحميل...",
      
      // Errors
      "error.general": "حدث خطأ ما",
      "error.network": "خطأ في الشبكة. يرجى فحص الاتصال.",
      "error.file_too_large": "حجم الملف يجب أن يكون أقل من 5 ميجابايت",
      "error.invalid_file_type": "نوع ملف غير صالح",
      "error.tprs_validation": "فشل في التحقق من TPRS"
    }
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'en', // default language
    fallbackLng: 'en',
    
    interpolation: {
      escapeValue: false // React already does escaping
    },
    
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage']
    }
  });

export default i18n;

// RTL language detection
export const isRTL = (language) => {
  return ['ar', 'he', 'fa', 'ur'].includes(language);
};

// Language direction helper
export const getDirection = (language) => {
  return isRTL(language) ? 'rtl' : 'ltr';
};

// CSS class helper for RTL
export const getRTLClass = (language) => {
  return isRTL(language) ? 'rtl' : 'ltr';
};