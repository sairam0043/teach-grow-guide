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
  email: string,
  subject?: string
): string => {
  let finalLink = meetingLink;
  if (!finalLink) {
    if (subject === "Verification Demo Class") {
      const code = Array.from(fallbackId || "").map(c => String.fromCharCode(97 + (c.charCodeAt(0) % 26))).join("").slice(0, 10);
      finalLink = `https://meet.google.com/${code.slice(0, 3)}-${code.slice(3, 7)}-${code.slice(7, 10)}`;
    } else {
      finalLink = `https://meet.jit.si/cuvasol-tutor-demo-${fallbackId}`;
    }
  }

  if (finalLink.includes("meet.google.com")) {
    return finalLink;
  }

  return `${finalLink}#config.prejoinPageEnabled=false&userInfo.displayName=${encodeURIComponent(
    displayName
  )}&userInfo.email=${encodeURIComponent(email || "")}`;
};
