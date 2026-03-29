# **App Name**: MomentumFlow

## Core Features:

- Secure Google Authentication: Enable user login and authentication via Google accounts, utilizing Firebase Authentication for a seamless and secure experience.
- Google Calendar Synchronization: Fetch upcoming and past events (title, time, description, calendar details) from Google Calendar. Display fetched data, handle color reflections and manage sync status.
- Future Event Quadrant Classification: Classify events within 30 days into 'Urgent & Important', 'Not Urgent & Important', 'Urgent & Not Important', or 'Not Urgent & Not Important' using a card-based UI with clear buttons. Classification results are saved to Firestore and can be edited later.
- Past Event Daily Reporting: For past events (including today's), users can mark them as 'Done', 'Failed', or 'Cancelled'. Allows for memo input and status changes, stored in Firestore.
- Weekly Progress Report: Generate a weekly summary displaying total events, counts per 4-quadrant category, and counts per 'Done'/'Failed'/'Cancelled' status, with space for a personalized reflection. Data structure supports future monthly/annual reports.
- AI-Powered Reflection Prompts: Based on the weekly report statistics, the tool generates gentle, encouraging reflection questions or messages to foster user insight and continuous improvement.
- Offline Access & Sync Management: Display already-fetched event data when offline and indicate sync status (pending, failed). Failed synchronizations can be retried by the user.

## Style Guidelines:

- A light color scheme to foster a sense of clarity and calm, appropriate for a coaching and productivity tool.
- Primary color: A professional and balanced blue, used for key interactive elements and branding. (Hex: #3362CC)
- Background color: A very subtle, desaturated light blue to provide a clean and focused canvas for content. (Hex: #EEF0F6)
- Accent color: An insightful and gentle purple for calls-to-action and important highlights, harmonizing with the primary blue. (Hex: #884DDE)
- Headline font: 'Alegreya', a humanist serif, conveying an elegant, intellectual, and contemporary feel for titles and prominent text.
- Body font: 'Inter', a grotesque sans-serif, providing modern, objective, and neutral readability for all detailed content and paragraphs.
- Utilize a set of simple, clear, and recognizable line icons to ensure easy navigation and quick comprehension, optimized for smartphone screens.
- Card-based interface for events and reports, allowing for easy, one-handed operation on smartphones without information overload. Key action buttons for quadrant classification are positioned at the bottom of the screen for accessibility.
- Implement subtle transition animations for state changes and view navigation, with an underlying structure designed to facilitate future integration of more expressive animations like card movements.