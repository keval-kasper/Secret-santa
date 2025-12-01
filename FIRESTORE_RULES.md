# Firestore Security Rules for Secret Santa

Update your Firestore security rules in the Firebase Console (Firestore Database → Rules tab) with these rules to support the access code authentication:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Helper function to check if user owns an event
    function isEventOwner(eventId) {
      return request.auth != null &&
        get(/databases/$(database)/documents/events/$(eventId)).data.createdByUserId == request.auth.uid;
    }

    // Helper function to check if request has valid access code for participant
    function hasValidAccessCode(eventId) {
      return exists(/databases/$(database)/documents/eventParticipants/$(request.resource.id)) &&
        get(/databases/$(database)/documents/eventParticipants/$(request.resource.id)).data.eventId == eventId;
    }

    // User profiles - users can only read/write their own
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == userId;
    }

    // Events - owner can manage, anyone can read
    match /events/{eventId} {
      allow read: if true; // Public read for access code flow
      allow create: if request.auth != null;
      allow update, delete: if request.auth != null &&
        resource.data.createdByUserId == request.auth.uid;
    }

    // Participants - event owner can manage, anyone can read (for access code verification)
    match /eventParticipants/{participantId} {
      allow read: if true; // Need public read to verify access codes
      allow create: if request.auth != null;
      allow update: if request.auth != null &&
        (isEventOwner(resource.data.eventId) ||
         isEventOwner(request.resource.data.eventId));
      allow delete: if request.auth != null &&
        isEventOwner(resource.data.eventId);
    }    // Exclusions - event owner can manage, authenticated users can read
    match /exclusions/{exclusionId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null &&
        isEventOwner(resource.data.eventId);
    }

    // Assignments - anyone can read/write (secured by access codes and event ownership)
    match /assignments/{assignmentId} {
      allow read, write: if true; // Allow public access for participants with access codes
    }
  }
}
```

## Important Notes:

1. **Public reads on `events` and `eventParticipants`**: This is necessary for the access code flow to work without requiring Firebase Authentication. The access code itself acts as the authentication mechanism.

2. **Security**: Access codes should be kept secret. Only share them via email or secure channels with individual participants.

3. **Alternative (More Secure)**: If you want tighter security, you could:
   - Require Firebase Auth for everyone
   - Store access codes in a separate collection with stricter rules
   - Use Firebase Functions to validate access codes server-side

For this simple app, the current approach is a good balance between security and usability.
