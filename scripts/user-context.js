/**
 * @typedef {Object} UserProfile
 * @property {string} id - Unique user id.
 * @property {string} [name] - Display name.
 * @property {string} [email] - Email address.
 * @property {number} [createdAt] - Account creation timestamp.
 */

/**
 * Initializes user context helpers and UI hydration.
 * @category User Context
 * @subcategory UI & Init
 */
function initUserContext() {
	if (typeof window === 'undefined') return;
	window.userContext = { resolveUserId, getActiveUserProfile };
	document.addEventListener('DOMContentLoaded', hydrateUserContext);
}


function isGuestSessionActive() {
	return sessionStorage.getItem('guestLogin') === '1' || localStorage.getItem('guestLogin') === '1';
}


function hasFirebaseAuth() {
	return typeof firebase !== 'undefined' && typeof firebase.auth === 'function';
}


function hasDatabaseRef() {
	return typeof db !== 'undefined' && db && typeof db.ref === 'function';
}


function setStoredUserId(userId) {
	if (!userId) return;
	sessionStorage.setItem('userId', userId);
}


function getStoredUserId() {
	return sessionStorage.getItem('userId');
}


function getCurrentAuthUser() {
	if (!hasFirebaseAuth()) return null;
	return firebase.auth().currentUser;
}


function getCurrentAuthUserId() {
	return getCurrentAuthUser()?.uid || null;
}


function getAuthUserEmail() {
	return getCurrentAuthUser()?.email || '';
}


function deriveNameFromAuth() {
	const user = getCurrentAuthUser();
	return user?.displayName || user?.email?.split('@')[0] || '';
}


async function resolveUserId() {
	if (isGuestSessionActive()) return null;
	const storedId = getStoredUserId();
	if (storedId) return storedId;
	const authUserId = getCurrentAuthUserId();
	if (authUserId) return cacheAndReturnUserId(authUserId);
	if (!hasFirebaseAuth()) return null;
	return waitForAuthUserId();
}


function cacheAndReturnUserId(userId) {
	setStoredUserId(userId);
	return userId;
}


function waitForAuthUserId() {
	return new Promise((resolve) => {
		firebase.auth().onAuthStateChanged((user) => {
			setStoredUserId(user?.uid);
			resolve(user?.uid || null);
		});
	});
}


async function getActiveUserProfile() {
	const userId = await resolveUserId();
	if (!userId) return null;
	return fetchUserProfile(userId);
}


async function fetchUserProfile(userId) {
	if (!userId || !hasDatabaseRef()) return null;
	const snapshot = await db.ref(`users/${userId}`).get();
	const data = snapshot.val();
	if (data) return { id: userId, ...data };
	return createFallbackUserProfile(userId);
}


async function createFallbackUserProfile(userId) {
	const fallbackProfile = buildFallbackProfile();
	await db.ref(`users/${userId}`).update(fallbackProfile);
	return { id: userId, ...fallbackProfile };
}


function buildFallbackProfile() {
	return {
		name: deriveNameFromAuth() || 'User',
		email: getAuthUserEmail(),
		createdAt: Date.now(),
	};
}


function computeInitials(name, email) {
	const source = (name || '').trim() || (email || '').trim();
	if (!source) return 'G';
	const parts = source.split(/\s+/).filter(Boolean);
	if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
	return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}


function updateHeaderProfile(profile) {
	const button = document.querySelector('.profile-btn');
	if (!button) return;
	button.textContent = computeInitials(profile?.name, profile?.email);
	button.setAttribute('aria-label', profile?.name || 'Guest');
}


function updateGreetingName(profile) {
	const nameElement = document.getElementById('user-name');
	if (!nameElement) return;
	nameElement.textContent = profile?.name || 'Guest';
}


function escapeHtml(text = '') {
	return String(text)
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;');
}


async function hydrateUserContext() {
	const profile = await getActiveUserProfile();
	updateHeaderProfile(profile);
	updateGreetingName(profile);
}


initUserContext();