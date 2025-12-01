// Firebase modular v9 setup with simple helpers used across the app.
import { initializeApp } from 'firebase/app'
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth'
import {
  getFirestore,
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  setDoc,
  serverTimestamp,
  deleteDoc,
} from 'firebase/firestore'

// TODO: replace these placeholders with your real Firebase project settings.
const firebaseConfig = {
  apiKey: 'YOUR_API_KEY',
  authDomain: 'YOUR_AUTH_DOMAIN',
  projectId: 'YOUR_PROJECT_ID',
  storageBucket: 'YOUR_STORAGE_BUCKET',
  messagingSenderId: 'YOUR_SENDER_ID',
  appId: 'YOUR_APP_ID',
}

const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = getFirestore(app)

// Auth helpers
export function registerWithEmail(email, password) {
  return createUserWithEmailAndPassword(auth, email, password)
}

export function loginWithEmail(email, password) {
  return signInWithEmailAndPassword(auth, email, password)
}

export function logoutUser() {
  return signOut(auth)
}

// Firestore helper to store a user profile for quick lookup.
export async function createUserProfile(user, displayName) {
  if (!user) return
  const userRef = doc(db, 'users', user.uid)
  const snapshot = await getDoc(userRef)
  if (!snapshot.exists()) {
    await setDoc(userRef, {
      id: user.uid,
      displayName: displayName || user.displayName || '',
      email: user.email,
      createdAt: serverTimestamp(),
    })
  }
  return userRef
}

// Firestore convenience functions used by pages
export const collections = {
  events: () => collection(db, 'events'),
  participants: () => collection(db, 'eventParticipants'),
  exclusions: () => collection(db, 'exclusions'),
  assignments: () => collection(db, 'assignments'),
  users: () => collection(db, 'users'),
}

export async function createEvent(payload) {
  return addDoc(collections.events(), {
    ...payload,
    createdAt: serverTimestamp(),
    isMatchingGenerated: false,
  })
}

export async function addParticipant(participant) {
  return addDoc(collections.participants(), {
    ...participant,
    status: participant.status || 'invited',
    createdAt: serverTimestamp(),
  })
}

export async function addExclusion(exclusion) {
  return addDoc(collections.exclusions(), exclusion)
}

export async function removeExclusion(id) {
  return deleteDoc(doc(db, 'exclusions', id))
}

export async function setAssignments(eventId, assignments) {
  // Clears previous assignments for an event, then writes the new set.
  const assignmentSnap = await getDocs(
    query(collections.assignments(), where('eventId', '==', eventId))
  )
  const batchDeletes = assignmentSnap.docs.map((d) => deleteDoc(doc(db, 'assignments', d.id)))
  await Promise.all(batchDeletes)

  const writes = assignments.map((assignment) =>
    addDoc(collections.assignments(), {
      eventId,
      ...assignment,
    })
  )
  return Promise.all(writes)
}

export async function markEventMatched(eventId) {
  return setDoc(
    doc(db, 'events', eventId),
    {
      isMatchingGenerated: true,
    },
    { merge: true }
  )
}
