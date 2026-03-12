const MOBILE_CONTACTS_BREAKPOINT_QUERY = '(max-width: 768px)';

/**
 * Returns whether contacts mobile layout is active.
 * @returns {boolean} True when viewport matches the mobile breakpoint.
 * @category Contacts
 * @subcategory UI & Init
 */
function isMobileContactsLayout() {
	return window.matchMedia(MOBILE_CONTACTS_BREAKPOINT_QUERY).matches;
}


/**
 * Updates desktop details panel scrollability based on real overflow.
 * @category Contacts
 * @subcategory UI & Init
 */
function syncContactDetailsSectionScrollability() {
	const detailsSection = document.querySelector('.contact-details-section');
	if (!detailsSection) return;
	if (isMobileContactsLayout()) {
		detailsSection.classList.remove('is-scrollable');
		return;
	}
	const hasOverflow = detailsSection.scrollHeight - detailsSection.clientHeight > 1;
	detailsSection.classList.toggle('is-scrollable', hasOverflow);
}


/**
 * Schedules a scrollability sync after current layout updates.
 * @category Contacts
 * @subcategory UI & Init
 */
function scheduleContactDetailsSectionScrollabilitySync() {
	window.requestAnimationFrame(syncContactDetailsSectionScrollability);
}


/**
 * Toggles mobile contact details view.
 * @param {boolean} isOpen - Whether the details panel should be visible.
 * @category Contacts
 * @subcategory UI & Init
 */
function setMobileContactDetailsState(isOpen) {
	if (!document.body) return;
	const shouldShowDetails = Boolean(isOpen) && isMobileContactsLayout();
	document.body.classList.toggle('contacts-mobile-details-open', shouldShowDetails);
	if (!shouldShowDetails) {
		setMobileContactActionMenuState(false);
	}
	scheduleContactDetailsSectionScrollabilitySync();
}


/**
 * Toggles the mobile floating contact action menu.
 * @param {boolean} isOpen - Whether the menu should be open.
 * @category Contacts
 * @subcategory UI & Init
 */
function setMobileContactActionMenuState(isOpen) {
	const menu = document.getElementById('mobile-contact-detail-menu');
	const trigger = document.getElementById('mobile-contact-detail-menu-btn');
	if (!menu || !trigger) return;
	const shouldOpen = Boolean(isOpen) && document.body?.classList.contains('contacts-mobile-details-open');
	if (!shouldOpen && menu.contains(document.activeElement) && typeof trigger.focus === 'function') {
		try {
			trigger.focus({ preventScroll: true });
		} catch (error) {
			trigger.focus();
		}
	}
	menu.classList.toggle('is-open', shouldOpen);
	menu.setAttribute('aria-hidden', shouldOpen ? 'false' : 'true');
	trigger.setAttribute('aria-expanded', shouldOpen ? 'true' : 'false');
}


/**
 * Returns the currently selected contact.
 * @returns {{id: string, name: string, email: string, phone: string, createdAt?: number} | null} Selected contact.
 * @category Contacts
 * @subcategory UI & Init
 */
function getSelectedContact() {
	return contactsState.find((contact) => contact.id === selectedContactId) || null;
}


/**
 * Binds the mobile back button to return from details to list view.
 * @param {HTMLElement | null} backButton - Mobile back button.
 * @category Contacts
 * @subcategory UI & Init
 */
function bindMobileBackButton(backButton) {
	if (!backButton) return;
	backButton.addEventListener('click', () => {
		setMobileContactActionMenuState(false);
		setMobileContactDetailsState(false);
	});
}


/**
 * Binds the mobile action menu toggle button.
 * @param {HTMLElement | null} menuButton - Menu toggle button.
 * @param {HTMLElement | null} actionMenu - Action menu container.
 * @category Contacts
 * @subcategory UI & Init
 */
function bindMobileMenuToggle(menuButton, actionMenu) {
	if (!menuButton || !actionMenu) return;
	menuButton.addEventListener('click', () => {
		const isOpen = actionMenu.classList.contains('is-open');
		setMobileContactActionMenuState(!isOpen);
	});
}


/**
 * Closes the mobile action menu when clicking outside of it.
 * @param {HTMLElement | null} menuButton - Menu toggle button.
 * @param {HTMLElement | null} actionMenu - Action menu container.
 * @category Contacts
 * @subcategory UI & Init
 */
function bindMobileMenuOutsideClose(menuButton, actionMenu) {
	if (!menuButton || !actionMenu) return;
	document.addEventListener('click', (event) => {
		if (!actionMenu.classList.contains('is-open')) return;
		if (actionMenu.contains(event.target) || menuButton.contains(event.target)) return;
		setMobileContactActionMenuState(false);
	});
}


/**
 * Binds mobile edit action to open the edit overlay.
 * @param {HTMLElement | null} editButton - Mobile edit button.
 * @category Contacts
 * @subcategory UI & Init
 */
function bindMobileEditButton(editButton) {
	if (!editButton) return;
	editButton.addEventListener('click', () => {
		const selectedContact = getSelectedContact();
		if (!selectedContact) return;
		setMobileContactActionMenuState(false);
		openEditContactOverlay(selectedContact.id, selectedContact);
	});
}


/**
 * Binds mobile delete action for the currently selected contact.
 * @param {HTMLElement | null} deleteButton - Mobile delete button.
 * @category Contacts
 * @subcategory UI & Init
 */
function bindMobileDeleteButton(deleteButton) {
	if (!deleteButton) return;
	deleteButton.addEventListener('click', async () => {
		const selectedContact = getSelectedContact();
		if (!selectedContact) return;
		setMobileContactActionMenuState(false);
		await deleteContact(selectedContact.id);
		await refreshContactsList();
	});
}


/**
 * Creates a viewport-change handler for mobile contact layout transitions.
 * @param {MediaQueryList} mediaQuery - Mobile breakpoint media query.
 * @returns {() => void} Viewport change handler.
 * @category Contacts
 * @subcategory UI & Init
 */
function createMobileViewportChangeHandler(mediaQuery) {
	return () => {
		if (!mediaQuery.matches) {
			setMobileContactDetailsState(false);
			setMobileContactActionMenuState(false);
		}
		scheduleContactDetailsSectionScrollabilitySync();
	};
}


/**
 * Subscribes to viewport changes to reset mobile-only UI state.
 * @category Contacts
 * @subcategory UI & Init
 */
function bindMobileViewportChangeListener() {
	const mediaQuery = window.matchMedia(MOBILE_CONTACTS_BREAKPOINT_QUERY);
	const onViewportChange = createMobileViewportChangeHandler(mediaQuery);
	if (typeof mediaQuery.addEventListener === 'function') mediaQuery.addEventListener('change', onViewportChange);
	if (typeof mediaQuery.addListener === 'function') mediaQuery.addListener(onViewportChange);
}


/**
 * Binds the Escape key to close the mobile action menu.
 * @category Contacts
 * @subcategory UI & Init
 */
function bindMobileEscapeHandler() {
	window.addEventListener('keydown', (event) => {
		if (event.key !== 'Escape') return;
		setMobileContactActionMenuState(false);
	});
}


/**
 * Initializes mobile-only controls for switching between list and details.
 * @category Contacts
 * @subcategory UI & Init
 */
function initMobileContactDetailsControls() {
	const backButton = document.getElementById('mobile-contact-back-btn');
	const menuButton = document.getElementById('mobile-contact-detail-menu-btn');
	const actionMenu = document.getElementById('mobile-contact-detail-menu');
	const editButton = document.getElementById('mobile-contact-menu-edit');
	const deleteButton = document.getElementById('mobile-contact-menu-delete');

	bindMobileBackButton(backButton);
	bindMobileMenuToggle(menuButton, actionMenu);
	bindMobileMenuOutsideClose(menuButton, actionMenu);
	bindMobileEditButton(editButton);
	bindMobileDeleteButton(deleteButton);
	bindMobileViewportChangeListener();
	bindMobileEscapeHandler();
}
