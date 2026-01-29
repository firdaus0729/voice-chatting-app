/**
 * Weekly contest service — track host active room minutes, auto-reward top 3.
 */

import {
  doc,
  getDoc,
  updateDoc,
  serverTimestamp,
  increment,
  collection,
  query,
  orderBy,
  limit,
  getDocs,
  setDoc,
} from 'firebase/firestore';
import { getFirebaseDb } from '@/services/firebase';
import type { FirestoreWeeklyContest } from '@/types/firestore';

const CONTESTS_COLLECTION = 'weekly_contests';
const USERS_COLLECTION = 'users';

function getDb() {
  const db = getFirebaseDb();
  if (!db) throw new Error('Firestore not initialized');
  return db;
}

function contestRef(id: string) {
  return doc(getDb(), CONTESTS_COLLECTION, id);
}

function userRef(uid: string) {
  return doc(getDb(), USERS_COLLECTION, uid);
}

/**
 * Get current week's contest.
 */
export async function getCurrentContest(): Promise<FirestoreWeeklyContest | null> {
  const now = Date.now();
  const weekStart = new Date(now);
  weekStart.setHours(0, 0, 0, 0);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Start of week (Sunday)

  const contestId = `week_${weekStart.getTime()}`;
  const snap = await getDoc(contestRef(contestId));
  if (!snap.exists()) {
    // Create new contest for this week
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);

    const newContest: FirestoreWeeklyContest = {
      id: contestId,
      weekStart: { seconds: Math.floor(weekStart.getTime() / 1000), nanoseconds: 0 } as any,
      weekEnd: { seconds: Math.floor(weekEnd.getTime() / 1000), nanoseconds: 0 } as any,
      hostMinutes: {},
      topHostUids: [],
      rewardsDistributed: false,
      updatedAt: serverTimestamp() as any,
    };

    await setDoc(contestRef(contestId), newContest);
    return newContest;
  }

  return snap.data() as FirestoreWeeklyContest;
}

/**
 * Add host minutes (call periodically while user is hosting).
 */
export async function addHostMinutes(uid: string, minutes: number): Promise<void> {
  const contest = await getCurrentContest();
  if (!contest) throw new Error('Contest not found');

  const currentMinutes = contest.hostMinutes[uid] ?? 0;
  const newMinutes = currentMinutes + minutes;

  await updateDoc(contestRef(contest.id), {
    [`hostMinutes.${uid}`]: newMinutes,
    updatedAt: serverTimestamp(),
  } as any);
}

/**
 * Reset contest (admin only) — creates new week.
 */
export async function resetContest(): Promise<string> {
  const now = Date.now();
  const weekStart = new Date(now);
  weekStart.setHours(0, 0, 0, 0);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());

  const contestId = `week_${weekStart.getTime()}`;
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);

  const newContest: FirestoreWeeklyContest = {
    id: contestId,
    weekStart: { seconds: Math.floor(weekStart.getTime() / 1000), nanoseconds: 0 } as any,
    weekEnd: { seconds: Math.floor(weekEnd.getTime() / 1000), nanoseconds: 0 } as any,
    hostMinutes: {},
    topHostUids: [],
    rewardsDistributed: false,
    updatedAt: serverTimestamp() as any,
  };

  await setDoc(contestRef(contestId), newContest);
  return contestId;
}

/**
 * Distribute rewards to top 3 hosts (auto or manual).
 */
export async function distributeContestRewards(contestId: string): Promise<void> {
  const contestSnap = await getDoc(contestRef(contestId));
  if (!contestSnap.exists()) throw new Error('Contest not found');
  const contest = contestSnap.data() as FirestoreWeeklyContest;

  if (contest.rewardsDistributed) {
    throw new Error('Rewards already distributed');
  }

  // Get top 3 hosts
  const entries = Object.entries(contest.hostMinutes)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3);

  const topHostUids = entries.map(([uid]) => uid);

  // Reward top 3 (frame + coins)
  // Frame ID and coin amounts should be configurable
  const rewards = [
    { coins: 5000, frameId: 'contest_gold_frame' },
    { coins: 3000, frameId: 'contest_silver_frame' },
    { coins: 2000, frameId: 'contest_bronze_frame' },
  ];

  for (let i = 0; i < topHostUids.length; i += 1) {
    const uid = topHostUids[i];
    const reward = rewards[i];
    if (!reward) continue;

    const userSnap = await getDoc(userRef(uid));
    if (!userSnap.exists()) continue;

    const currentFrames = userSnap.data().inventory?.frameIds ?? [];
    const updateData: Record<string, unknown> = {
      'economy.coins': increment(reward.coins),
      'profile.updatedAt': serverTimestamp(),
    };

    if (!currentFrames.includes(reward.frameId)) {
      updateData['inventory.frameIds'] = [...currentFrames, reward.frameId];
    }

    await updateDoc(userRef(uid), updateData);
  }

  // Mark as distributed
  await updateDoc(contestRef(contestId), {
    topHostUids,
    rewardsDistributed: true,
    updatedAt: serverTimestamp(),
  });
}
