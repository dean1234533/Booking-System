/**
 * Automation Message Templates
 * PTs can use these templates or create custom messages
 */

export const AUTOMATION_TEMPLATES = [
  {
    id: "monthly-checkin",
    name: "Monthly Check-In",
    description: "General progress check-in",
    message: "Hi {clientName}! 👋\n\nIt's the start of a new month! How are you feeling with your fitness journey? Any progress or challenges you'd like to discuss?\n\nFeel free to message me back anytime!\n\n- {trainerName}",
    frequency: "monthly",
  },
  {
    id: "weekly-reminder",
    name: "Weekly Workout Reminder",
    description: "Motivational weekly reminder",
    message: "Hey {clientName}! 💪\n\nDon't forget to get your workouts in this week. You've got this!\n\nLet me know if you have any questions about your routine.\n\n- {trainerName}",
    frequency: "weekly",
  },
  {
    id: "nutrition-checkin",
    name: "Nutrition Check-In",
    description: "Nutrition habit reminder",
    message: "Hi {clientName}! 🥗\n\nHow's your nutrition going? Remember to stick to your nutrition plan and stay hydrated!\n\nFeel free to ask any questions or request adjustments.\n\n- {trainerName}",
    frequency: "monthly",
  },
  {
    id: "6week-plan",
    name: "6-Week Plan Review",
    description: "Major milestone check and plan update",
    message: "Hi {clientName}! 🎯\n\nIt's been 6 weeks! Time to review your progress and update your workout plan.\n\nLet's schedule a session to discuss your results and adjust your training for the next phase.\n\n- {trainerName}",
    frequency: "6weeks",
  },
  {
    id: "monthly-goals",
    name: "Monthly Goals Review",
    description: "Monthly goal setting",
    message: "Hi {clientName}! 📋\n\nAs we start this month, let's review last month's goals and set new ones for this month.\n\nWhat are 2-3 goals you'd like to achieve this month?\n\n- {trainerName}",
    frequency: "monthly",
  },
  {
    id: "birthday",
    name: "Birthday Message",
    description: "Birthday greeting",
    message: "Hey {clientName}! 🎉\n\nHappy Birthday! Hope you're having an amazing day!\n\nLet's celebrate your progress this year too. You've come such a long way!\n\n- {trainerName}",
    frequency: "yearly",
  },
  {
    id: "recovery-reminder",
    name: "Recovery & Rest Reminder",
    description: "Rest day and recovery focus",
    message: "Hi {clientName}! 😴\n\nReminder: Recovery is just as important as training!\n\nMake sure you're getting enough sleep, staying hydrated, and taking at least one full rest day per week.\n\n- {trainerName}",
    frequency: "biweekly",
  },
  {
    id: "form-check",
    name: "Form & Technique Check",
    description: "Exercise form reminder",
    message: "Hi {clientName}! 💯\n\nQuick reminder: Quality over quantity!\n\nMake sure you're maintaining proper form on all exercises. Better to do fewer reps with good form than many with poor form.\n\nLet me know if you need form tips!\n\n- {trainerName}",
    frequency: "biweekly",
  },
];

export const FREQUENCY_OPTIONS = [
  { value: "weekly", label: "Weekly", days: 7 },
  { value: "biweekly", label: "Every 2 Weeks", days: 14 },
  { value: "monthly", label: "Monthly", days: 30 },
  { value: "6weeks", label: "Every 6 Weeks", days: 42 },
  { value: "quarterly", label: "Quarterly (Every 3 Months)", days: 90 },
  { value: "yearly", label: "Yearly", days: 365 },
  { value: "custom", label: "Custom Interval", days: null },
];

export const getTemplateById = (id) => {
  return AUTOMATION_TEMPLATES.find((t) => t.id === id);
};

export const interpolateMessage = (message, { clientName, trainerName }) => {
  return message
    .replace(/\{clientName\}/g, clientName || "Client")
    .replace(/\{trainerName\}/g, trainerName || "Your Trainer");
};

export const getNextSendDate = (frequency, customDays = null) => {
  const today = new Date();
  const freqData = FREQUENCY_OPTIONS.find((f) => f.value === frequency);
  const daysToAdd = frequency === "custom" ? customDays : freqData?.days || 30;

  const nextDate = new Date(today);
  nextDate.setDate(nextDate.getDate() + daysToAdd);
  return nextDate.toISOString();
};
