/**
 * OmniTask - Premium Task Management Application
 * Pure Modular JavaScript (ES6+)
 */

document.addEventListener('DOMContentLoaded', () => {
  // ==========================================================================
  // Application State
  // ==========================================================================
  const state = {
    tasks: [],
    filter: 'all', // 'all' | 'active' | 'completed'
    searchQuery: '',
    theme: 'light' // 'light' | 'dark'
  };

  // ==========================================================================
  // DOM Elements
  // ==========================================================================
  const elements = {
    loader: document.getElementById('loader'),
    appContainer: document.getElementById('appContainer'),
    
    // Theme
    themeToggle: document.getElementById('themeToggle'),
    
    // Stats Dashboard
    statsTotal: document.getElementById('statsTotal'),
    statsPending: document.getElementById('statsPending'),
    statsCompleted: document.getElementById('statsCompleted'),
    statsPercentage: document.getElementById('statsPercentage'),
    progressCircle: document.getElementById('progressCircle'),
    progressPhrase: document.getElementById('progressPhrase'),
    
    // Input Form
    taskForm: document.getElementById('taskForm'),
    taskInput: document.getElementById('taskInput'),
    charCounter: document.getElementById('charCounter'),
    addTaskBtn: document.getElementById('addTaskBtn'),
    
    // Search & Filter
    searchInput: document.getElementById('searchInput'),
    clearSearchBtn: document.getElementById('clearSearchBtn'),
    filterSlider: document.getElementById('filterSlider'),
    filterBtnAll: document.getElementById('filterBtnAll'),
    filterBtnActive: document.getElementById('filterBtnActive'),
    filterBtnCompleted: document.getElementById('filterBtnCompleted'),
    filterBtns: document.querySelectorAll('.filter-btn'),
    
    // List Area
    taskList: document.getElementById('taskList'),
    emptyState: document.getElementById('emptyState'),
    emptyCtaBtn: document.getElementById('emptyCtaBtn'),
    
    // Footer
    footerTaskCount: document.getElementById('footerTaskCount'),
    clearCompletedBtn: document.getElementById('clearCompletedBtn'),
    
    // Toasts
    toastContainer: document.getElementById('toastContainer')
  };

  // SVG Progress Circle Math Constant
  // Radius = 26 -> Circumference = 2 * PI * r = 2 * 3.14159 * 26 ≈ 163.36
  const RING_CIRCUMFERENCE = 163.36;

  // ==========================================================================
  // Application Initialization
  // ==========================================================================
  function init() {
    // 1. Load data from Local Storage
    loadLocalStorage();
    
    // 2. Setup theme styling
    applyTheme();
    
    // 3. Setup event listeners
    setupEventListeners();
    
    // 4. Initial Render
    render();
    
    // 5. Position sliding filter indicator initially
    setTimeout(updateFilterSlider, 50);

    // 6. Dismiss Preloader with premium delay
    setTimeout(() => {
      if (elements.loader) {
        elements.loader.classList.add('fade-out');
      }
    }, 800);
  }

  // ==========================================================================
  // Local Storage Synchronization
  // ==========================================================================
  function loadLocalStorage() {
    try {
      // Load tasks
      const savedTasks = localStorage.getItem('OmniTask_tasks');
      state.tasks = savedTasks ? JSON.parse(savedTasks) : [];

      // Load theme
      const savedTheme = localStorage.getItem('OmniTask_theme');
      if (savedTheme === 'light' || savedTheme === 'dark') {
        state.theme = savedTheme;
      } else {
        // Fallback to browser system theme preference
        state.theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      }

      // Load filter preference
      const savedFilter = localStorage.getItem('OmniTask_filter');
      if (['all', 'active', 'completed'].includes(savedFilter)) {
        state.filter = savedFilter;
        // Set active class on corresponding filter button
        elements.filterBtns.forEach(btn => {
          if (btn.dataset.filter === state.filter) {
            btn.classList.add('active');
          } else {
            btn.classList.remove('active');
          }
        });
      }
    } catch (e) {
      console.error('Error reading from Local Storage:', e);
      state.tasks = [];
      state.theme = 'light';
      state.filter = 'all';
    }
  }

  function saveTasksToLocalStorage() {
    try {
      localStorage.setItem('OmniTask_tasks', JSON.stringify(state.tasks));
    } catch (e) {
      console.error('Error writing tasks to Local Storage:', e);
      showToast('Storage limit exceeded. Could not save tasks.', 'error');
    }
  }

  function saveThemeToLocalStorage() {
    localStorage.setItem('OmniTask_theme', state.theme);
  }

  function saveFilterToLocalStorage() {
    localStorage.setItem('OmniTask_filter', state.filter);
  }

  // ==========================================================================
  // Visual Theme Operations
  // ==========================================================================
  function applyTheme() {
    document.documentElement.setAttribute('data-theme', state.theme);
  }

  function toggleTheme() {
    state.theme = state.theme === 'light' ? 'dark' : 'light';
    applyTheme();
    saveThemeToLocalStorage();
    showToast(`Switched to ${state.theme} mode`, 'info');
  }

  // ==========================================================================
  // Event Listeners Binding
  // ==========================================================================
  function setupEventListeners() {
    // Theme Switcher Click
    if (elements.themeToggle) {
      elements.themeToggle.addEventListener('click', toggleTheme);
    }

    // Input text validation and character limits
    if (elements.taskInput) {
      elements.taskInput.addEventListener('input', (e) => {
        const length = e.target.value.length;
        if (elements.charCounter) {
          elements.charCounter.textContent = `${length}/100`;
          
          if (length >= 90) {
            elements.charCounter.className = 'input-char-counter limit-danger';
          } else if (length >= 75) {
            elements.charCounter.className = 'input-char-counter limit-warn';
          } else {
            elements.charCounter.className = 'input-char-counter';
          }
        }
      });
    }

    // Task submission
    if (elements.taskForm) {
      elements.taskForm.addEventListener('submit', (e) => {
        e.preventDefault();
        handleTaskAddition();
      });
    }

    // Keyboard 'Enter' is naturally handled by the form submit event.

    // Real-time search engine
    if (elements.searchInput) {
      elements.searchInput.addEventListener('input', (e) => {
        state.searchQuery = e.target.value.trim().toLowerCase();
        
        // Show/hide search clear button
        if (elements.clearSearchBtn) {
          elements.clearSearchBtn.style.display = state.searchQuery ? 'flex' : 'none';
        }
        
        render(false); // Render without full rebuilding of static triggers
      });
    }

    // Clear search query button
    if (elements.clearSearchBtn) {
      elements.clearSearchBtn.addEventListener('click', () => {
        if (elements.searchInput) {
          elements.searchInput.value = '';
          state.searchQuery = '';
          elements.clearSearchBtn.style.display = 'none';
          elements.searchInput.focus();
          render(false);
        }
      });
    }

    // Filter Buttons Selection with sliding panel action
    elements.filterBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        // Toggle Active Classes
        elements.filterBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        // Update State
        state.filter = btn.dataset.filter;
        saveFilterToLocalStorage();
        
        // Relocate visual indicator
        updateFilterSlider();
        
        // Re-render
        render();
      });
    });

    // Window resizing modifies segmented filter slider geometry
    window.addEventListener('resize', updateFilterSlider);

    // Clear all completed button
    if (elements.clearCompletedBtn) {
      elements.clearCompletedBtn.addEventListener('click', handleClearCompleted);
    }

    // Empty state call-to-action button
    if (elements.emptyCtaBtn) {
      elements.emptyCtaBtn.addEventListener('click', () => {
        if (elements.taskInput) {
          elements.taskInput.focus();
        }
      });
    }
  }

  // ==========================================================================
  // Segmented Slider Filter UI Physics
  // ==========================================================================
  function updateFilterSlider() {
    const activeBtn = document.querySelector('.filter-btn.active');
    if (activeBtn && elements.filterSlider) {
      const offsetLeft = activeBtn.offsetLeft;
      const width = activeBtn.offsetWidth;
      elements.filterSlider.style.width = `${width}px`;
      elements.filterSlider.style.transform = `translateX(${offsetLeft - 3}px)`;
    }
  }

  // ==========================================================================
  // Core Business Logic Actions
  // ==========================================================================
  function handleTaskAddition() {
    if (!elements.taskInput) return;
    
    const taskText = elements.taskInput.value.trim();
    
    // 1. Validation check - empty
    if (!taskText) {
      showToast('Task description cannot be empty!', 'warning');
      elements.taskInput.focus();
      return;
    }
    
    // 2. Validation check - length
    if (taskText.length > 100) {
      showToast('Task description cannot exceed 100 characters!', 'warning');
      return;
    }
    
    // 3. Validation check - duplicates
    const isDuplicate = state.tasks.some(
      task => task.text.toLowerCase() === taskText.toLowerCase() && !task.completed
    );
    if (isDuplicate) {
      showToast('This active task already exists!', 'warning');
      return;
    }
    
    // 4. Create Task Object
    const newTask = {
      id: Date.now().toString(),
      text: taskText,
      completed: false,
      createdAt: new Date().toISOString()
    };
    
    // 5. Add to array & synchronize
    state.tasks.push(newTask); // Append task to appear at the bottom
    saveTasksToLocalStorage();
    
    // 6. Reset form
    elements.taskInput.value = '';
    if (elements.charCounter) {
      elements.charCounter.textContent = '0/100';
      elements.charCounter.className = 'input-char-counter';
    }
    
    // 7. Update UI
    render();
    
    // Auto-scroll to bottom of the page
    setTimeout(() => {
      window.scrollTo({
        top: document.body.scrollHeight,
        behavior: 'smooth'
      });
    }, 10);
    
    // 8. Visual feedback success
    showToast('Task created successfully!', 'success');
  }

  function handleTaskToggle(id) {
    state.tasks = state.tasks.map(task => {
      if (task.id === id) {
        const updatedStatus = !task.completed;
        // Fire appropriate micro toast alerts
        if (updatedStatus) {
          showToast('Completed focus point! Great job.', 'success');
        } else {
          showToast('Task marked back to active.', 'info');
        }
        return { ...task, completed: updatedStatus };
      }
      return task;
    });
    
    saveTasksToLocalStorage();
    render();
  }

  function handleTaskDeletion(id, cardElement) {
    if (!cardElement) return;

    // Trigger visual exit slide animation
    cardElement.classList.add('fade-out');

    // Wait for the exit CSS keyframe (350ms) to complete before state deletion
    setTimeout(() => {
      state.tasks = state.tasks.filter(task => task.id !== id);
      saveTasksToLocalStorage();
      render();
      showToast('Task has been permanently removed.', 'error');
    }, 350);
  }

  function handleClearCompleted() {
    const completedCount = state.tasks.filter(t => t.completed).length;
    
    if (completedCount === 0) {
      showToast('No completed tasks to clear.', 'info');
      return;
    }
    
    // State modifications
    state.tasks = state.tasks.filter(t => !t.completed);
    saveTasksToLocalStorage();
    render();
    
    showToast(`Successfully cleared ${completedCount} completed items.`, 'success');
  }

  // ==========================================================================
  // Real-Time Notification Toast Manager
  // ==========================================================================
  function showToast(message, type = 'info') {
    if (!elements.toastContainer) return;
    
    // Create element structure
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    // Assign corresponding icon
    let iconClass = 'fa-circle-info';
    if (type === 'success') iconClass = 'fa-circle-check toast-success-icon';
    if (type === 'error') iconClass = 'fa-circle-xmark toast-error-icon';
    if (type === 'warning') iconClass = 'fa-triangle-exclamation toast-warning-icon';
    if (type === 'info') iconClass = 'fa-circle-info toast-info-icon';
    
    toast.innerHTML = `
      <i class="fa-solid ${iconClass} toast-icon"></i>
      <span class="toast-text">${message}</span>
      <button class="toast-close" aria-label="Dismiss toast">
        <i class="fa-solid fa-xmark"></i>
      </button>
      <div class="toast-progress"></div>
    `;
    
    // Append to overlay
    elements.toastContainer.appendChild(toast);
    
    // Event listener: close button
    const closeBtn = toast.querySelector('.toast-close');
    closeBtn.addEventListener('click', () => dismissToast(toast));
    
    // Auto-dismiss after progress completes (3500ms)
    setTimeout(() => {
      if (toast.parentNode) {
        dismissToast(toast);
      }
    }, 3500);
  }

  function dismissToast(toast) {
    toast.classList.add('removing');
    // Remove element completely after animation out (300ms)
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 300);
  }

  // ==========================================================================
  // UI Render & Draw Engine
  // ==========================================================================
  function render(fullRebuild = true) {
    // 1. Core Analytics Calculation
    const stats = calculateStatistics();
    
    // 2. Refresh top statistics widgets
    updateStatsDashboard(stats);
    
    // 3. Filters and Search matching
    const filteredTasks = getFilteredTasks();
    
    // 4. Render lists
    renderTaskList(filteredTasks, fullRebuild);
    
    // 5. Update footer counts
    updateFooter(stats.pending);
  }

  function calculateStatistics() {
    const total = state.tasks.length;
    const completed = state.tasks.filter(t => t.completed).length;
    const pending = total - completed;
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
    
    return { total, completed, pending, percent };
  }

  function updateStatsDashboard(stats) {
    if (elements.statsTotal) elements.statsTotal.textContent = stats.total;
    if (elements.statsPending) elements.statsPending.textContent = stats.pending;
    if (elements.statsCompleted) elements.statsCompleted.textContent = stats.completed;
    if (elements.statsPercentage) elements.statsPercentage.textContent = `${stats.percent}%`;
    
    // SVG Circular Progress animation update
    updateCircularProgressRing(stats.percent);
    
    // Expressive dynamic summary phrase updates
    if (elements.progressPhrase) {
      if (stats.total === 0) {
        elements.progressPhrase.textContent = 'Awaiting tasks';
      } else if (stats.percent === 100) {
        elements.progressPhrase.textContent = 'All focuses cleared! 🎉';
      } else if (stats.percent >= 75) {
        elements.progressPhrase.textContent = 'Almost completed! 💪';
      } else if (stats.percent >= 40) {
        elements.progressPhrase.textContent = 'Nice momentum! 🚀';
      } else if (stats.percent > 0) {
        elements.progressPhrase.textContent = 'Underway';
      } else {
        elements.progressPhrase.textContent = 'Ready to launch';
      }
    }
  }

  function updateCircularProgressRing(percent) {
    if (!elements.progressCircle) return;
    
    // Calculate progress offset
    // offset = Circumference - (Percent / 100 * Circumference)
    const offset = RING_CIRCUMFERENCE - (percent / 100 * RING_CIRCUMFERENCE);
    
    // Apply stroke-dasharray and stroke-dashoffset to draw SVG
    elements.progressCircle.style.strokeDasharray = `${RING_CIRCUMFERENCE} ${RING_CIRCUMFERENCE}`;
    elements.progressCircle.style.strokeDashoffset = offset;
  }

  function getFilteredTasks() {
    return state.tasks.filter(task => {
      // 1. Search Query Filter Match
      const matchesSearch = task.text.toLowerCase().includes(state.searchQuery);
      
      // 2. Categorization Tab Filter Match
      if (state.filter === 'active') {
        return matchesSearch && !task.completed;
      }
      if (state.filter === 'completed') {
        return matchesSearch && task.completed;
      }
      
      return matchesSearch; // All filter
    });
  }

  function renderTaskList(filteredTasks, fullRebuild) {
    if (!elements.taskList || !elements.emptyState) return;

    // Toggle Empty state viewports
    if (filteredTasks.length === 0) {
      elements.taskList.style.display = 'none';
      elements.emptyState.style.display = 'flex';
      
      // Update empty state text based on context (searching vs no tasks)
      const emptyTitle = elements.emptyState.querySelector('.empty-title');
      const emptySubtitle = elements.emptyState.querySelector('.empty-subtitle');
      const ctaBtn = elements.emptyState.querySelector('.empty-cta-btn');
      
      if (state.searchQuery) {
        emptyTitle.textContent = 'No search results found';
        emptySubtitle.textContent = `No task matching "${state.searchQuery}" was located. Double check spelling.`;
        ctaBtn.style.display = 'none';
      } else if (state.filter === 'active') {
        emptyTitle.textContent = 'No active tasks';
        emptySubtitle.textContent = 'Awesome! You have finished all active targets. Add a new focus.';
        ctaBtn.style.display = 'flex';
      } else if (state.filter === 'completed') {
        emptyTitle.textContent = 'No completed tasks';
        emptySubtitle.textContent = 'Keep focusing! Tasks you mark as done will appear here.';
        ctaBtn.style.display = 'none';
      } else {
        emptyTitle.textContent = "All clear, you're set!";
        emptySubtitle.textContent = 'Your task workspace is ready. Plan a new focus and start creating.';
        ctaBtn.style.display = 'flex';
      }
      return;
    }

    elements.emptyState.style.display = 'none';
    elements.taskList.style.display = 'flex';

    // Optimizing render iterations: If we're just typing search details, only recreate what changed.
    // However, to guarantee smooth fade-in arrival animations without re-animating existing tasks,
    // we manage task elements uniquely.
    
    // Get list of existing task DOM IDs to avoid heavy DOM rebuilds if unnecessary
    const existingDomIds = Array.from(elements.taskList.querySelectorAll('.task-card')).map(el => el.dataset.id);
    const incomingIds = filteredTasks.map(t => t.id);

    const isStructureMatching = existingDomIds.length === incomingIds.length && 
                                existingDomIds.every((id, idx) => id === incomingIds[idx]);

    // Check complete state changes on existing matches to trigger fast CSS adjustments
    if (isStructureMatching && !fullRebuild) {
      filteredTasks.forEach(task => {
        const card = elements.taskList.querySelector(`.task-card[data-id="${task.id}"]`);
        if (card) {
          const checkbox = card.querySelector('input[type="checkbox"]');
          const isDomChecked = checkbox.checked;
          
          if (task.completed !== isDomChecked) {
            checkbox.checked = task.completed;
            if (task.completed) {
              card.classList.add('completed');
              const badge = card.querySelector('.task-badge');
              badge.className = 'task-badge badge-completed';
              badge.innerHTML = '<i class="fa-solid fa-check"></i> Completed';
            } else {
              card.classList.remove('completed');
              const badge = card.querySelector('.task-badge');
              badge.className = 'task-badge badge-pending';
              badge.innerHTML = '<i class="fa-solid fa-circle-dot"></i> Pending';
            }
          }
        }
      });
      return;
    }

    // Clean rebuild
    elements.taskList.innerHTML = '';
    
    filteredTasks.forEach(task => {
      const taskCard = createTaskCardDOM(task);
      elements.taskList.appendChild(taskCard);
    });
  }

  function createTaskCardDOM(task) {
    const li = document.createElement('li');
    li.className = `task-card fade-in ${task.completed ? 'completed' : ''}`;
    li.dataset.id = task.id;
    
    // Formatting date
    const dateObj = new Date(task.createdAt);
    const dateFormatted = dateObj.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    li.innerHTML = `
      <label class="checkbox-container">
        <input type="checkbox" ${task.completed ? 'checked' : ''} aria-label="Toggle task completed state">
        <span class="checkmark">
          <svg viewBox="0 0 10 10">
            <polyline points="2,5.5 4.5,8 8,2.5"></polyline>
          </svg>
        </span>
      </label>
      
      <div class="task-content">
        <span class="task-text">${escapeHtml(task.text)}</span>
        <div class="task-meta">
          <span class="task-date"><i class="fa-regular fa-calendar"></i> ${dateFormatted}</span>
          ${task.completed ? 
            `<span class="task-badge badge-completed"><i class="fa-solid fa-check"></i> Completed</span>` : 
            `<span class="task-badge badge-pending"><i class="fa-solid fa-circle-dot"></i> Pending</span>`
          }
        </div>
      </div>
      
      <div class="task-actions">
        <button class="delete-btn" aria-label="Delete Task">
          <i class="fa-regular fa-trash-can"></i>
        </button>
      </div>
    `;

    // Event binding: Checkbox Completed Toggle click
    const checkbox = li.querySelector('input[type="checkbox"]');
    checkbox.addEventListener('change', () => handleTaskToggle(task.id));

    // Event binding: Deletion action
    const deleteBtn = li.querySelector('.delete-btn');
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      handleTaskDeletion(task.id, li);
    });

    return li;
  }

  function updateFooter(pendingCount) {
    if (elements.footerTaskCount) {
      if (pendingCount === 1) {
        elements.footerTaskCount.textContent = '1 active item left';
      } else {
        elements.footerTaskCount.textContent = `${pendingCount} active items left`;
      }
    }
  }

  // ==========================================================================
  // Helper / Utility Functions
  // ==========================================================================
  function escapeHtml(text) {
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
  }

  // ==========================================================================
  // Run Main Initialization
  // ==========================================================================
  init();
});
