(function initUserContext() {
	if (typeof window === 'undefined') return;

	const isGuest = () => sessionStorage.getItem('guestLogin') === '1';

	const hasAuth = () => typeof firebase !== 'undefined' && typeof firebase.auth === 'function';

	const hasDb = () => typeof db !== 'undefined' && db && typeof db.ref === 'function';

	const setStoredUserId = (userId) => {
		if (!userId) return;
		sessionStorage.setItem('userId', userId);
	};

	const getStoredUserId = () => sessionStorage.getItem('userId');

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

	const deriveNameFromAuth = () => {
		if (!hasAuth()) return '';
		const user = firebase.auth().currentUser;
		return user?.displayName || user?.email?.split('@')[0] || '';
	};

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

	const getActiveUserProfile = async () => {
		const userId = await resolveUserId();
		if (!userId) return null;
		return fetchUserProfile(userId);
	};

	const computeInitials = (name, email) => {
		const source = (name || '').trim() || (email || '').trim();
		if (!source) return 'G';
		const parts = source.split(/\s+/).filter(Boolean);
		if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
		return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
	};

	const updateHeaderProfile = (profile) => {
		const btn = document.querySelector('.profile-btn');
		if (!btn) return;
		const initials = computeInitials(profile?.name, profile?.email);
		btn.textContent = initials;
		btn.setAttribute('aria-label', profile?.name || 'Guest');
	};

	const updateGreetingName = (profile) => {
		const nameEl = document.getElementById('user-name');
		if (!nameEl) return;
		nameEl.textContent = profile?.name || 'Guest';
	};

	const populateAssignedToSelect = async () => {
		const select = document.querySelector('select[data-role="assigned-to"]');
		if (!select || !hasDb()) return;

		const snapshot = await db.ref('users').get();
		const users = snapshot.val() || {};

		const placeholder = select.querySelector('option[data-placeholder]');
		select.innerHTML = '';
		if (placeholder) {
			select.appendChild(placeholder);
		} else {
			const option = document.createElement('option');
			option.textContent = 'Select contacts to assign';
			option.disabled = true;
			option.selected = true;
			option.setAttribute('data-placeholder', '1');
			select.appendChild(option);
		}

		Object.entries(users).forEach(([id, user]) => {
			const option = document.createElement('option');
			option.value = id;
			option.textContent = user?.name || user?.email || 'User';
			select.appendChild(option);
		});
	};

	const renderContactsList = async () => {
		const list = document.getElementById('contacts-list');
		if (!list || !hasDb()) return;

		const snapshot = await db.ref('users').get();
		const users = snapshot.val() || {};
		list.innerHTML = '';

		Object.entries(users).forEach(([id, user]) => {
			const li = document.createElement('li');
			li.className = 'contact-item';

			const name = document.createElement('span');
			name.className = 'contact-name';
			name.textContent = user?.name || 'Unnamed';

			const email = document.createElement('span');
			email.className = 'contact-email';
			email.textContent = user?.email || '';

			li.appendChild(name);
			li.appendChild(email);
			li.dataset.userId = id;
			list.appendChild(li);
		});
	};

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
