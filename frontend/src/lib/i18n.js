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
      "auth.no_account": "Don't have an account?",
      "auth.have_account": "Already have an account?",
      "auth.please_wait": "Please wait...",
      
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