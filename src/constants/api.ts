export const API_ENDPOINTS = {
  AUTH: {
    WECHAT_LOGIN: '/api/auth/wechat-login',
    EMAIL_LOGIN: '/api/auth/email-login',
    EMAIL_REGISTER: '/api/auth/email-register',
    BIND_EMAIL: '/api/auth/bind-email',
    PROFILE: '/api/user/profile',
  },

  READING: {
    START: '/api/reading/start',
    RESULT: (taskId: string) => `/api/reading/result/${taskId}`,
    CANCEL: (taskId: string) => `/api/reading/cancel/${taskId}`,
    HEALTH: '/api/health',
  },

  RECORD: {
    LIST: '/api/user/records',
    DETAIL: (id: string) => `/api/user/records/${id}`,
  },

  POSTER: {
    GENERATE: '/api/poster',
    KEY: '/api/poster/key',
    DOWNLOAD: (cacheKey: string) => `/api/poster/${cacheKey}`,
    START: '/api/poster/start',
    RESULT: (taskId: string) => `/api/poster/result/${taskId}`,
    CANCEL: (taskId: string) => `/api/poster/cancel/${taskId}`,
  },

  STATS: {
    USER: '/api/user/stats',
    CHECKIN: '/api/checkin',
    CHECKIN_STATUS: '/api/checkin/status',
    TASKS: '/api/tasks',
    CLAIM_TASK: (taskId: string) => `/api/tasks/${taskId}/claim`,
    INVITE_CODE: '/api/invite/code',
    INVITE_RECORDS: '/api/invite/records',
    LEVELS: '/api/levels',
    BIND_REFERRAL: '/api/user/bind-referral',
  },

  FEEDBACK: {
    SUBMIT: '/api/feedback',
    LIST: '/api/feedback',
    DETAIL: (id: string) => `/api/feedback/${id}`,
    UPLOAD_IMAGE: '/api/upload/feedback',
  },

  CONFIG: {
    APP: '/api/app-config',
    PAGE_SECTIONS: '/api/page-sections',
  },

  LOG: {
    CLIENT_EVENTS: '/api/client-events',
  },

  UPLOAD: {
    AVATAR: '/api/upload/avatar',
  },
} as const
