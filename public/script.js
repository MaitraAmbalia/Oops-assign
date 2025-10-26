/**
 * Utility function to format a timestamp into a "time ago" string.
 * @param {Date | string} date - The timestamp.
 * @returns {string} - e.g., "2h ago"
 */
function formatTimeAgo(date) {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    const seconds = Math.floor((new Date() - dateObj) / 1000);
    const intervals = { y: 31536000, mo: 2592000, d: 86400, h: 3600, m: 60 };
    for (const key in intervals) {
        const interval = Math.floor(seconds / intervals[key]);
        if (interval >= 1) return `${interval}${key} ago`;
    }
    return `${Math.floor(seconds)}s ago`;
}

class LinkUpApp {
    constructor() {
        this.API_BASE_URL = '/api'; // Relative path for Vercel
        this.state = { currentUser: null, posts: new Map() };
        this.bindDOMSelectors();
        this.bindEventListeners();
    }

    bindDOMSelectors() {
        this.authModal = document.getElementById('auth-modal');
        this.loginForm = document.getElementById('login-form');
        this.signupForm = document.getElementById('signup-form');
        this.authTabs = document.querySelector('.auth-tabs');
        this.pageApp = document.getElementById('page-app');
        this.logoutButton = document.getElementById('logout-button');
        this.navFeed = document.getElementById('nav-feed');
        this.navProfile = document.getElementById('nav-profile');
        this.viewFeed = document.getElementById('view-feed');
        this.viewProfile = document.getElementById('view-profile');
        this.sidebarAvatar = document.getElementById('sidebar-avatar');
        this.sidebarName = document.getElementById('sidebar-name');
        this.sidebarTitle = document.getElementById('sidebar-title');
        this.createPostAvatar = document.getElementById('create-post-avatar');
        this.postContentInput = document.getElementById('post-content-input');
        this.submitPostButton = document.getElementById('submit-post-button');
        this.postFeedContainer = document.getElementById('post-feed-container');
        this.profileAvatar = document.getElementById('profile-avatar');
        this.profileName = document.getElementById('profile-name');
        this.profileTitle = document.getElementById('profile-title');
        this.profileAbout = document.getElementById('profile-about');
        this.profilePostsContainer = document.getElementById('profile-posts-container');
        this.commentsModal = document.getElementById('comments-modal');
        this.closeCommentsModalBtn = document.getElementById('close-comments-modal');
        this.commentsListContainer = document.getElementById('comments-list-container');
        this.commentForm = document.getElementById('comment-form');
        this.commentInput = document.getElementById('comment-input');
        this.commentPostIdInput = document.getElementById('comment-post-id');
        this.modalCommentAvatar = document.getElementById('modal-comment-avatar');
        this.commentsModalTitle = document.getElementById('comments-modal-title');
    }

    bindEventListeners() {
        this.authTabs.addEventListener('click', this.handleAuthTabSwitch.bind(this));
        this.loginForm.addEventListener('submit', this.handleLogin.bind(this));
        this.signupForm.addEventListener('submit', this.handleSignup.bind(this));
        this.logoutButton.addEventListener('click', this.handleLogout.bind(this));
        this.navFeed.addEventListener('click', () => this.navigateTo('feed'));
        this.navProfile.addEventListener('click', () => this.navigateTo('profile'));
        this.submitPostButton.addEventListener('click', this.handleCreatePost.bind(this));
        this.postContentInput.addEventListener('input', () => {
            this.submitPostButton.disabled = this.postContentInput.value.trim().length === 0;
        });
        const postClickHandler = (event) => {
            const postElement = event.target.closest('.post');
            if (!postElement) return;
            const postId = postElement.dataset.postId;
            if (event.target.closest('.action-like')) this.handleLike(postId);
            else if (event.target.closest('.action-comment')) this.openCommentsModal(postId);
        };
        this.postFeedContainer.addEventListener('click', postClickHandler);
        this.profilePostsContainer.addEventListener('click', postClickHandler);
        this.commentForm.addEventListener('submit', this.handleAddComment.bind(this));
        this.closeCommentsModalBtn.addEventListener('click', this.closeCommentsModal.bind(this));
        this.commentsModal.addEventListener('click', (e) => {
            if (e.target === this.commentsModal) this.closeCommentsModal();
        });
    }

    handleAuthTabSwitch(event) {
        const clickedTab = event.target.closest('.auth-tab');
        if (!clickedTab) return;
        document.querySelectorAll('.auth-tab').forEach(tab => tab.classList.remove('active'));
        clickedTab.classList.add('active');
        const view = clickedTab.dataset.view;
        document.querySelectorAll('.auth-view').forEach(v => v.classList.add('hidden'));
        document.getElementById(`${view}-form`).classList.remove('hidden');
    }

    async handleLogin(event) {
        event.preventDefault();
        this.state.currentUser = { id: 'user_12345', name: "Demo User", title: "Frontend Developer", avatar: "https://placehold.co/200x200/60A5FA/FFFFFF?text=DU", about: "A passionate developer exploring MERN stack." };
        this.authModal.classList.add('hidden');
        this.pageApp.classList.remove('hidden');
        await this.loadDataFromServer();
        this.updateCurrentUserUI();
    }
    
    async handleSignup(event) {
        event.preventDefault();
        const name = this.signupForm['username'].value;
        this.state.currentUser = { id: `user_${Date.now()}`, name: name || "Anonymous", title: "New LinkUp Member", avatar: `https://placehold.co/200x200/9CA3AF/FFFFFF?text=${(name || 'A').substring(0,2).toUpperCase()}`, about: "" };
        this.authModal.classList.add('hidden');
        this.pageApp.classList.remove('hidden');
        await this.loadDataFromServer();
        this.updateCurrentUserUI();
    }

    handleLogout() {
        this.state.currentUser = null;
        this.pageApp.classList.add('hidden');
        this.authModal.classList.remove('hidden');
        this.state.posts.clear();
    }

    async apiRequest(endpoint, method = 'GET', body = null) {
        try {
            const options = { method, headers: { 'Content-Type': 'application/json' } };
            if (body) options.body = JSON.stringify(body);
            const response = await fetch(`${this.API_BASE_URL}${endpoint}`, options);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            return response.json();
        } catch (error) {
            console.error(`API request failed: ${method} ${endpoint}`, error);
            throw error;
        }
    }

    async loadDataFromServer() {
        try {
            const posts = await this.apiRequest('/posts');
            this.state.posts.clear();
            posts.forEach(post => this.state.posts.set(post._id, post));
            this.renderFeed();
            this.renderProfilePosts();
        } catch (error) {
            this.postFeedContainer.innerHTML = "<p>Could not load posts. Is the backend server running?</p>";
        }
    }

    async handleCreatePost() {
        const content = this.postContentInput.value.trim();
        if (!content) return;
        const { id, name, title, avatar } = this.state.currentUser;
        await this.apiRequest('/posts', 'POST', { userId: id, userName: name, userTitle: title, userAvatar: avatar, content });
        this.postContentInput.value = '';
        this.submitPostButton.disabled = true;
        await this.loadDataFromServer();
    }

    async handleLike(postId) {
        const updatedPost = await this.apiRequest(`/posts/${postId}/like`, 'POST', { userId: this.state.currentUser.id });
        this.state.posts.set(postId, updatedPost);
        this.renderFeed();
        this.renderProfilePosts();
    }

    async handleAddComment(event) {
        event.preventDefault();
        const postId = this.commentPostIdInput.value;
        const text = this.commentInput.value.trim();
        if (!postId || !text) return;
        const { id, name, title, avatar } = this.state.currentUser;
        const updatedPost = await this.apiRequest(`/posts/${postId}/comment`, 'POST', { userId: id, userName: name, userTitle: title, userAvatar: avatar, text });
        this.state.posts.set(postId, updatedPost);
        this.commentInput.value = '';
        this.renderComments(postId);
        this.renderFeed();
        this.renderProfilePosts();
    }

    createPostElement(post) {
        const postElement = document.createElement('div');
        postElement.className = 'card post';
        postElement.dataset.postId = post._id;
        const hasLiked = post.likes.includes(this.state.currentUser.id);
        postElement.innerHTML = `<div class="post-header"><img class="avatar-medium" src="${post.userAvatar}" alt="${post.userName} Avatar"><div class="post-header-info"><h4>${post.userName}</h4><p>${post.userTitle}</p><p class="timestamp">${formatTimeAgo(post.timestamp)}</p></div></div><div class="post-content"><p>${post.content}</p></div><div class="post-stats"><span class="like-count">${post.likes.length} Likes</span><span class="comment-count">${post.comments.length} Comments</span></div><div class="post-actions"><button class="action-button action-like ${hasLiked ? 'liked' : ''}">👍 Like</button><button class="action-button action-comment">💬 Comment</button></div>`;
        return postElement;
    }

    renderFeed() {
        this.postFeedContainer.innerHTML = '';
        [...this.state.posts.values()].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).forEach(post => this.postFeedContainer.appendChild(this.createPostElement(post)));
    }

    renderProfilePosts() {
        this.profilePostsContainer.innerHTML = '';
        const userPosts = [...this.state.posts.values()].filter(post => post.userId === this.state.currentUser.id).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        if (userPosts.length === 0) this.profilePostsContainer.innerHTML = '<p style="text-align: center;">No posts yet.</p>';
        else userPosts.forEach(post => this.profilePostsContainer.appendChild(this.createPostElement(post)));
    }

    renderComments(postId) {
        const post = this.state.posts.get(postId);
        if (!post) return;
        this.commentsListContainer.innerHTML = '';
        this.commentsModalTitle.textContent = `Comments on ${post.userName}'s post`;
        if (post.comments.length === 0) {
             this.commentsListContainer.innerHTML = '<p style="text-align: center;">No comments yet.</p>';
             return;
        }
        post.comments.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp)).forEach(comment => {
            const commentElement = document.createElement('div');
            commentElement.className = 'comment';
            commentElement.innerHTML = `<img class="avatar-small" src="${comment.userAvatar}" alt="${comment.userName} Avatar"><div class="comment-body"><div class="comment-header"><h5>${comment.userName}</h5><span class="timestamp">${formatTimeAgo(comment.timestamp)}</span></div><p>${comment.userTitle}</p><p>${comment.text}</p></div>`;
            this.commentsListContainer.appendChild(commentElement);
        });
    }

    updateCurrentUserUI() {
        const user = this.state.currentUser;
        if (!user) return;
        [this.sidebarAvatar, this.createPostAvatar, this.modalCommentAvatar, this.profileAvatar].forEach(el => el.src = user.avatar);
        this.sidebarName.textContent = this.profileName.textContent = user.name;
        this.sidebarTitle.textContent = this.profileTitle.textContent = user.title;
        this.profileAbout.textContent = user.about || "This user hasn't written an 'about' section yet.";
    }

    navigateTo(viewName) {
        document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active'));
        this.viewFeed.classList.toggle('hidden', viewName !== 'feed');
        this.viewProfile.classList.toggle('hidden', viewName !== 'profile');
        document.getElementById(`nav-${viewName}`).classList.add('active');
    }

    openCommentsModal(postId) {
        this.commentPostIdInput.value = postId;
        this.renderComments(postId);
        this.commentsModal.classList.remove('hidden');
    }

    closeCommentsModal() {
        this.commentsModal.classList.add('hidden');
    }
}

document.addEventListener('DOMContentLoaded', () => new LinkUpApp());