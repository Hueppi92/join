/**
 * Initializes user context helpers and UI hydration.
 * @category User Context
 * @subcategory UI & Init
 */
(function initUserContext() {
	if (typeof window === 'undefined') return;

	/**
	 * Checks whether the current session is a guest login.
	 * @returns {boolean}
	 * @category User Context
	 * @subcategory Firebase Logic
	 */
	const isGuest = () => sessionStorage.getItem('guestLogin') === '1';

	/**
	 * Returns whether Firebase auth is available.
	 * @returns {boolean}
	 * @category User Context
	 * @subcategory Firebase Logic
	 */
	const hasAuth = () => typeof firebase !== 'undefined' && typeof firebase.auth === 'function';

	/**
	 * Returns whether the database API is available.
	 * @returns {boolean}
	 * @category User Context
	 * @subcategory Firebase Logic
	 */
	const hasDb = () => typeof db !== 'undefined' && db && typeof db.ref === 'function';

	/**
	 * Stores the user id in session storage.
	 * @param {string | undefined | null} userId
	 * @category User Context
	 * @subcategory Firebase Logic
	 */
	const setStoredUserId = (userId) => {
		if (!userId) return;
		sessionStorage.setItem('userId', userId);
	};

	/**
	 * Gets the stored user id from session storage.
	 * @returns {string | null}
	 * @category User Context
	 * @subcategory Firebase Logic
	 */
	const getStoredUserId = () => sessionStorage.getItem('userId');

	/**
	 * Resolves the active user id from storage or Firebase auth.
	 * @returns {Promise<string | null>}
	 * @category User Context
	 * @subcategory Firebase Logic
	 */
	const resolveUserId = async () => {
		if (isGuest()) return null;
		const storedId = getStoredUserId();
		if (storedId) return storedId;
		if (!hasAuth()) return null;

		const currentUser = firebase.auth().currentUser;
		if (currentUser && currentUser.uid) {
			setStoredUserId(currentUser.uid);
			return currentUser.uid;
		}

		return new Promise((resolve) => {
			firebase.auth().onAuthStateChanged((user) => {
				setStoredUserId(user?.uid);
				resolve(user?.uid || null);
			});
		});
	};

	/**
	 * Derives the display name from the current Firebase auth user.
	 * @returns {string}
	 * @category User Context
	 * @subcategory Firebase Logic
	 */
	const deriveNameFromAuth = () => {
		if (!hasAuth()) return '';
		const user = firebase.auth().currentUser;
		return user?.displayName || user?.email?.split('@')[0] || '';
	};

	/**
	 * Fetches the user profile from the database or creates a fallback.
	 * @param {string} userId
	 * @returns {Promise<{id: string, name?: string, email?: string, createdAt?: number} | null>}
	 * @category User Context
	 * @subcategory Firebase Logic
	 */
	const fetchUserProfile = async (userId) => {
		if (!userId || !hasDb()) return null;
		const snapshot = await db.ref(`users/${userId}`).get();
		const data = snapshot.val();
		if (data) return { id: userId, ...data };

		const name = deriveNameFromAuth() || 'User';
		const email = hasAuth() ? firebase.auth().currentUser?.email || '' : '';
		const fallbackProfile = { name, email, createdAt: Date.now() };
		await db.ref(`users/${userId}`).update(fallbackProfile);
		return { id: userId, ...fallbackProfile };
	};

	/**
	 * Resolves the active user profile.
	 * @returns {Promise<{id: string, name?: string, email?: string, createdAt?: number} | null>}
	 * @category User Context
	 * @subcategory Firebase Logic
	 */
	const getActiveUserProfile = async () => {
		const userId = await resolveUserId();
		if (!userId) return null;
		return fetchUserProfile(userId);
	};

	/**
	 * Computes initials for the profile button.
	 * @param {string} name
	 * @param {string} email
	 * @returns {string}
	 * @category User Context
	 * @subcategory Validation
	 */
	const computeInitials = (name, email) => {
		const source = (name || '').trim() || (email || '').trim();
		if (!source) return 'G';
		const parts = source.split(/\s+/).filter(Boolean);
		if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
		return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
	};

	/**
	 * Updates the profile button initials in the header.
	 * @param {{name?: string, email?: string} | null} profile
	 * @category User Context
	 * @subcategory UI & Init
	 */
	const updateHeaderProfile = (profile) => {
		const btn = document.querySelector('.profile-btn');
		if (!btn) return;
		const initials = computeInitials(profile?.name, profile?.email);
		btn.textContent = initials;
		btn.setAttribute('aria-label', profile?.name || 'Guest');
	};

	/**
	 * Updates the greeting name on summary pages.
	 * @param {{name?: string} | null} profile
	 * @category User Context
	 * @subcategory UI & Init
	 */
	const updateGreetingName = (profile) => {
		const nameEl = document.getElementById('user-name');
		if (!nameEl) return;
		nameEl.textContent = profile?.name || 'Guest';
	};

	/**
	 * Escapes text for safe HTML rendering.
	 * @param {string} text
	 * @returns {string}
	 * @category User Context
	 * @subcategory Validation
	 */
	const escapeHtml = (text = '') =>
		String(text)
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			.replace(/"/g, '&quot;')
			.replace(/'/g, '&#39;');

	/**
	 * Populates the "assigned to" select with user options.
	 * @returns {Promise<void>}
	 * @category User Context
	 * @subcategory UI & Init
	 */
	const populateAssignedToSelect = async () => {
		const select = document.querySelector('select[data-role="assigned-to"]');
		if (!select || !hasDb()) return;

		const snapshot = await db.ref('users').get();
		const users = snapshot.val() || {};

		let optionsHtml = '<option disabled selected data-placeholder="1">Select contacts to assign</option>';
		Object.entries(users).forEach(([id, user]) => {
			const safeId = escapeHtml(id);
			const name = escapeHtml(user?.name || user?.email || 'User');
			optionsHtml += `<option value="${safeId}">${name}</option>`;
		});
		select.innerHTML = optionsHtml;
	};

	/**
	 * Renders the contacts list from user data.
	 * @returns {Promise<void>}
	 * @category User Context
	 * @subcategory UI & Init
	 */
	const renderContactsList = async () => {
		const list = document.getElementById('contacts-list');
		if (!list || !hasDb()) return;

		const snapshot = await db.ref('users').get();
		const users = snapshot.val() || {};
		let listHtml = '';
		Object.entries(users).forEach(([id, user]) => {
			const safeId = escapeHtml(id);
			const name = escapeHtml(user?.name || 'Unnamed');
			const email = escapeHtml(user?.email || '');
			listHtml += `
				<li class="contact-item" data-user-id="${safeId}">
					<span class="contact-name">${name}</span>
					<span class="contact-email">${email}</span>
				</li>
			`;
		});
		list.innerHTML = listHtml;
	};

	/**
	 * Hydrates user context into the UI.
	 * @returns {Promise<void>}
	 * @category User Context
	 * @subcategory UI & Init
	 */
	const hydrateUserContext = async () => {
		const profile = await getActiveUserProfile();
		updateHeaderProfile(profile);
		updateGreetingName(profile);
		populateAssignedToSelect();
		renderContactsList();
	};

	window.userContext = {
		resolveUserId,
		getActiveUserProfile,
	};

	document.addEventListener('DOMContentLoaded', hydrateUserContext);
})();
