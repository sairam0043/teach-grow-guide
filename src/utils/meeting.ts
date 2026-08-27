/**
 * Resolves a clean and properly configured meeting link for tutors and students.
 * For Jitsi, it appends configuration parameters for display names and emails.
 * For Google Meet, it returns the clean link directly.
 * 
 * @param meetingLink - The base meeting link from the booking schema
 * @param fallbackId - The fallback booking ID to generate a Jitsi room if empty
 * @param displayName - The user's display name for Jitsi initialization
 * @param email - The user's email for Jitsi initialization
 */
export const getMeetingHref = (
  meetingLink: string | undefined,
  fallbackId: string,
  displayName: string,
  email: string
): string => {
  const finalLink = meetingLink || `https://meet.jit.si/cuvasol-tutor-demo-${fallbackId}`;
  
  if (finalLink.includes("meet.google.com")) {
    return finalLink;
  }
  
  return `${finalLink}#config.prejoinPageEnabled=false&userInfo.displayName=${encodeURIComponent(
    displayName
  )}&userInfo.email=${encodeURIComponent(email || "")}`;
};
