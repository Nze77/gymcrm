export const getWelcomeMessage = (name: string, joinDate: string, validTill: string, gymName: string = 'AM Fitness') => {
  return `Hey ${name}! 👋

Welcome to ${gymName}! 🏋️

Your membership is active from ${joinDate} to ${validTill}.

Here are our rules & regulations:
• Carry your membership card at all times
• Respect equipment and fellow members
• No outside food inside the gym
• Timings: 6AM–10AM | 5PM–9PM

See you on the floor! 💪
— ${gymName} Team`
}

export const getReminderMessage = (name: string, validTill: string, contactInfo: string = 'the front desk', gymName: string = 'AM Fitness') => {
  return `Hey ${name}! 👋

This is a friendly reminder that your gym membership expires on ${validTill}. 

Renew now to keep your streak going! 💪
Contact us to renew: ${contactInfo}

— ${gymName} Team`
}
