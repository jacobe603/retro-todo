document.addEventListener('DOMContentLoaded', function() {
    // Data structure for tasks
    let tasks = [];
    let currentFilter = 'all';
    let draggedTask = null;
    let selectedTaskId = null;
    let timerInterval = null;
    let isTimerRunning = false;
    let isWorkTime = true;
    let timeLeft = 25 * 60; // 25 minutes in seconds
    let timerAssignedTaskId = null; // Track which task the timer is assigned to
    let desktopTasks = []; // Tasks stored on desktop
    
    // Window dragging functionality
    let isDragging = false;
    let dragOffsetX = 0;
    let dragOffsetY = 0;
    
    // DOM Elements
    const appWindow = document.getElementById('app-window');
    const titleBar = document.getElementById('title-bar');
    const taskListEl = document.getElementById('task-list');
    const newTaskInput = document.getElementById('new-task-input');
    const addTaskBtn = document.getElementById('add-task-btn');
    const desktopEl = document.getElementById('desktop');
    
    const timerDisplayEl = document.getElementById('timer-display');
    const startTimerBtn = document.getElementById('start-timer-btn');
    const resetTimerBtn = document.getElementById('reset-timer-btn');
    const workTimeInput = document.getElementById('work-time');
    const breakTimeInput = document.getElementById('break-time');
    const assignTimerBtn = document.getElementById('assign-timer-btn');
    const currentTaskNameEl = document.getElementById('current-task-name');
    const taskCountEl = document.getElementById('task-count');
    const timeDateEl = document.getElementById('time-date');
    const timerStatusEl = document.getElementById('timer-status');
    const tabButtons = document.querySelectorAll('.tab');
    const clearCompletedBtn = document.getElementById('clear-completed-btn');
    
    // Generate unique IDs
    function generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }
    
    // Initialize the app
    function init() {
        // Load tasks from localStorage if available
        const savedTasks = localStorage.getItem('retroTodoTasks');
        if (savedTasks) {
            tasks = JSON.parse(savedTasks);
        }
        
        // Load desktop tasks
        const savedDesktopTasks = localStorage.getItem('retroTodoDesktopTasks');
        if (savedDesktopTasks) {
            desktopTasks = JSON.parse(savedDesktopTasks);
        }
        
        // Load timer assignment if available
        const savedTimerAssignment = localStorage.getItem('retroTodoTimerAssignment');
        if (savedTimerAssignment) {
            timerAssignedTaskId = savedTimerAssignment;
            
            // Verify the task still exists
            const assignedTask = findTaskById(timerAssignedTaskId);
            if (assignedTask) {
                currentTaskNameEl.textContent = assignedTask.text;
                timerStatusEl.textContent = `Timer assigned to: ${assignedTask.text}`;
            } else {
                // Task no longer exists, clear the assignment
                timerAssignedTaskId = null;
                localStorage.removeItem('retroTodoTimerAssignment');
            }
        }
        
        // Set up event handlers
        setupEventHandlers();
        
        // Initial render
        renderTasks();
        renderDesktopTasks();
        updateTimerDisplay();
        updateDateTime();
        
        // Update date and time every second
        setInterval(updateDateTime, 1000);
    }
    
    // Set up all event handlers
    function setupEventHandlers() {
        // Task Input
        addTaskBtn.addEventListener('click', addNewTask);
        newTaskInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') addNewTask();
        });
        
        // Timer Controls
        startTimerBtn.addEventListener('click', toggleTimer);
        resetTimerBtn.addEventListener('click', resetTimer);
        assignTimerBtn.addEventListener('click', assignTimerToTask);
        workTimeInput.addEventListener('change', updateTimerSettings);
        breakTimeInput.addEventListener('change', updateTimerSettings);
        
        // Tab navigation
        tabButtons.forEach(tab => {
            tab.addEventListener('click', (e) => {
                tabButtons.forEach(t => t.classList.remove('active'));
                e.target.classList.add('active');
                currentFilter = e.target.dataset.tab;
                renderTasks();
                
                // If we switched to completed tab, update task count to show time spent
                if (currentFilter === 'completed') {
                    updateTaskCount();
                }
            });
        });
        
        // Clear completed tasks
        clearCompletedBtn.addEventListener('click', () => {
            if (confirm('Are you sure you want to remove all completed tasks?')) {
                tasks = tasks.filter(task => !task.completed);
                saveTasksToLocalStorage();
                renderTasks();
                
                // Switch back to All Tasks tab
                tabButtons.forEach(t => t.classList.remove('active'));
                document.querySelector('[data-tab="all"]').classList.add('active');
                currentFilter = 'all';
            }
        });
        
        // Window dragging
        titleBar.addEventListener('mousedown', (e) => {
            isDragging = true;
            const rect = appWindow.getBoundingClientRect();
            dragOffsetX = e.clientX - rect.left;
            dragOffsetY = e.clientY - rect.top;
        });
        
        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            
            appWindow.style.left = `${e.clientX - dragOffsetX}px`;
            appWindow.style.top = `${e.clientY - dragOffsetY}px`;
            appWindow.style.transform = 'none'; // Remove the transform
        });
        
        document.addEventListener('mouseup', () => {
            isDragging = false;
        });
        
        // Window controls
        document.querySelector('.control.close').addEventListener('click', () => {
            if (confirm('Are you sure you want to close this application?')) {
                appWindow.style.display = 'none';
            }
        });
        
        document.querySelector('.control.minimize').addEventListener('click', () => {
            // Store original height for restoration
            appWindow.setAttribute('data-original-height', appWindow.style.height || '680px');
            appWindow.style.height = '30px';
            appWindow.style.overflow = 'hidden';
            appWindow.style.bottom = '10px';
            appWindow.style.top = 'auto';
            appWindow.style.left = '10px';
            appWindow.style.transform = 'none';
            appWindow.style.zIndex = '999';
            
            // Create restore button that spans the entire title bar
            const restoreBtn = document.createElement('div');
            restoreBtn.className = 'restore-btn';
            restoreBtn.style.position = 'absolute';
            restoreBtn.style.top = '0';
            restoreBtn.style.left = '0';
            restoreBtn.style.right = '0';
            restoreBtn.style.bottom = '0';
            restoreBtn.style.cursor = 'pointer';
            restoreBtn.style.zIndex = '1000';
            
            restoreBtn.addEventListener('click', () => {
                appWindow.style.height = appWindow.getAttribute('data-original-height');
                appWindow.style.overflow = '';
                appWindow.style.bottom = 'auto';
                appWindow.style.top = '50px';
                appWindow.style.left = '50%';
                appWindow.style.transform = 'translateX(-50%)';
                restoreBtn.remove();
                minimizeIndicator.remove();
            });
            
            appWindow.appendChild(restoreBtn);
            
            // Add a visual indicator that it can be clicked to restore
            const minimizeIndicator = document.createElement('div');
            minimizeIndicator.textContent = '▲ Click to restore';
            minimizeIndicator.style.position = 'absolute';
            minimizeIndicator.style.right = '100px';
            minimizeIndicator.style.top = '7px';
            minimizeIndicator.style.fontSize = '14px';
            minimizeIndicator.style.color = 'white';
            minimizeIndicator.style.pointerEvents = 'none';
            
            appWindow.appendChild(minimizeIndicator);
        });
        
        // Make desktop droppable
        desktopEl.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
        });
        
        desktopEl.addEventListener('drop', (e) => {
            e.preventDefault();
            
            // Check if what's being dropped is a parent task
            const data = e.dataTransfer.getData('application/json');
            if (data) {
                try {
                    const parsedData = JSON.parse(data);
                    if (parsedData.isParentTask) {
                        const taskId = parsedData.taskId;
                        const taskIndex = findTaskIndexById(taskId);
                        
                        if (taskIndex !== -1) {
                            // Create a copy of the task to add to desktop
                            const taskToMove = JSON.parse(JSON.stringify(tasks[taskIndex]));
                            
                            // Set position where dropped
                            taskToMove.position = {
                                left: `${e.clientX - 100}px`, // Center on cursor
                                top: `${e.clientY - 20}px`
                            };
                            
                            // Add to desktop
                            desktopTasks.push(taskToMove);
                            
                            // Remove from main tasks
                            tasks.splice(taskIndex, 1);
                            
                            // Save and render
                            saveDesktopTasksToLocalStorage();
                            saveTasksToLocalStorage();
                            renderDesktopTasks();
                            renderTasks();
                        }
                    }
                } catch (err) {
                    console.error('Error parsing dropped data:', err);
                }
            }
        });
    }
	
// Add a new task
function addNewTask() {
    const taskText = newTaskInput.value.trim();
    if (taskText) {
        const newTask = {
            id: generateId(),
            text: taskText,
            completed: false,
            subtasks: [],
            timeSpent: 0
        };
        
        tasks.push(newTask);
        saveTasksToLocalStorage();
        newTaskInput.value = '';
        
        // Store current expand/collapse states before re-rendering
        const expandStates = saveExpandStates();
        
        renderTasks();
        
        // Restore expand/collapse states after re-rendering
        restoreExpandStates(expandStates);
    }
}

// Add a subtask to a parent task
function addSubtask(parentId) {
    const parentTaskIndex = findTaskIndexById(parentId);
    if (parentTaskIndex === -1) return;
    
    const subtaskText = prompt('Enter subtask:');
    if (!subtaskText || !subtaskText.trim()) return;
    
    const newSubtask = {
        id: generateId(),
        text: subtaskText,
        completed: false,
        subtasks: [],
        timeSpent: 0
    };
    
    // If this is the first subtask, make sure subtasks array exists
    if (!tasks[parentTaskIndex].subtasks) {
        tasks[parentTaskIndex].subtasks = [];
    }
    
    tasks[parentTaskIndex].subtasks.push(newSubtask);
    
    // Save expansion state of parent task
    const parentEl = document.querySelector(`[data-id="${parentId}"]`);
    let isExpanded = true; // Default to expanded for new subtasks
    
    if (parentEl) {
        const subtasksContainer = parentEl.querySelector('.subtasks');
        if (subtasksContainer) {
            // Check if it's currently hidden
            isExpanded = !subtasksContainer.classList.contains('hidden-subtasks');
        }
    }
    
    // Store all current expand/collapse states before re-rendering
    const expandStates = saveExpandStates();
    
    saveTasksToLocalStorage();
    renderTasks();
    
    // Restore all expand/collapse states after re-rendering
    restoreExpandStates(expandStates);
    
    // Make sure this specific parent's subtasks are visible if adding the first subtask
    if (tasks[parentTaskIndex].subtasks.length === 1 || isExpanded) {
        const newParentEl = document.querySelector(`[data-id="${parentId}"]`);
        if (newParentEl) {
            const subtasksContainer = newParentEl.querySelector('.subtasks');
            if (subtasksContainer) {
                subtasksContainer.classList.remove('hidden-subtasks');
                
                // Update the expand button to show the dropdown arrow
                const expandBtn = newParentEl.querySelector('.task-actions div[title="Toggle subtasks"]');
                if (expandBtn) {
                    expandBtn.style.display = 'block';
                    expandBtn.textContent = '▼';
                }
            }
        }
    }
}

// Save current expand/collapse states of all tasks
function saveExpandStates() {
    const states = {};
    
    document.querySelectorAll('.task[data-id]').forEach(taskEl => {
        const taskId = taskEl.getAttribute('data-id');
        const subtasksContainer = taskEl.querySelector('.subtasks');
        
        if (subtasksContainer) {
            states[taskId] = !subtasksContainer.classList.contains('hidden-subtasks');
        }
    });
    
    return states;
}

// Restore expand/collapse states after re-rendering
function restoreExpandStates(states) {
    Object.keys(states).forEach(taskId => {
        const taskEl = document.querySelector(`[data-id="${taskId}"]`);
        if (taskEl) {
            const subtasksContainer = taskEl.querySelector('.subtasks');
            if (subtasksContainer) {
                if (states[taskId]) {
                    // Expand
                    subtasksContainer.classList.remove('hidden-subtasks');
                    const expandBtn = taskEl.querySelector('.task-actions div[title="Toggle subtasks"]');
                    if (expandBtn) expandBtn.textContent = '▼';
                } else {
                    // Collapse
                    subtasksContainer.classList.add('hidden-subtasks');
                    const expandBtn = taskEl.querySelector('.task-actions div[title="Toggle subtasks"]');
                    if (expandBtn) expandBtn.textContent = '►';
                }
            }
        }
    });
}

    // Toggle task completion status
    function toggleTaskCompletion(taskId, parentId = null) {
        const task = findTaskById(taskId, parentId);
        if (task) {
            task.completed = !task.completed;
            
            // If parent task is marked complete, mark all subtasks complete
            if (task.completed && task.subtasks && task.subtasks.length > 0) {
                task.subtasks.forEach(subtask => {
                    subtask.completed = true;
                });
            }
            
            // If a subtask is marked incomplete, its parent must also be incomplete
            if (!task.completed && parentId) {
                const parentTask = findTaskById(parentId);
                if (parentTask) {
                    parentTask.completed = false;
                }
            }
            
            // If task is completed and has timer assigned, stop the timer
            if (task.completed && timerAssignedTaskId === taskId) {
                clearInterval(timerInterval);
                isTimerRunning = false;
                startTimerBtn.textContent = 'Start';
                timerStatusEl.textContent = 'Timer stopped (task completed)';
            }
            
            // Store expand states before re-rendering
            const expandStates = saveExpandStates();
            
            saveTasksToLocalStorage();
            renderTasks();
            
            // Restore expand states after re-rendering
            restoreExpandStates(expandStates);
            updateTaskCount();
        }
    }

    // Find a task by its ID
    function findTaskById(taskId, parentId = null) {
        if (parentId) {
            const parentTask = findTaskById(parentId);
            return parentTask ? parentTask.subtasks.find(task => task.id === taskId) : null;
        } else {
            return tasks.find(task => task.id === taskId);
        }
    }

    // Find a task's index in the array
    function findTaskIndexById(taskId, parentId = null) {
        if (parentId) {
            const parentTask = findTaskById(parentId);
            return parentTask ? parentTask.subtasks.findIndex(task => task.id === taskId) : -1;
        } else {
            return tasks.findIndex(task => task.id === taskId);
        }
    }

    // Delete a task
    function deleteTask(taskId, parentId = null) {
        if (parentId) {
            // Delete subtask
            const parentTask = findTaskById(parentId);
            if (parentTask) {
                parentTask.subtasks = parentTask.subtasks.filter(task => task.id !== taskId);
            }
        } else {
            // Delete main task
            tasks = tasks.filter(task => task.id !== taskId);
        }
        
        // If the selected task is deleted, clear the selection
        if (selectedTaskId === taskId) {
            selectedTaskId = null;
            currentTaskNameEl.textContent = 'No task selected';
        }
        
        // If the timer-assigned task is deleted, clear the assignment
        if (timerAssignedTaskId === taskId) {
            timerAssignedTaskId = null;
            timerStatusEl.textContent = 'Timer not assigned';
            localStorage.removeItem('retroTodoTimerAssignment');
        }
        
        // Store current expand states before re-rendering
        const expandStates = saveExpandStates();
        
        saveTasksToLocalStorage();
        renderTasks();
        
        // Restore expand states after re-rendering
        restoreExpandStates(expandStates);
    }

    // Save tasks to localStorage
    function saveTasksToLocalStorage() {
        localStorage.setItem('retroTodoTasks', JSON.stringify(tasks));
        updateTaskCount();
    }

    // Save desktop tasks to localStorage
    function saveDesktopTasksToLocalStorage() {
        localStorage.setItem('retroTodoDesktopTasks', JSON.stringify(desktopTasks));
    }

    // Count all tasks (including subtasks)
    function countTasks(taskList) {
        return taskList.reduce((count, task) => {
            return count + 1 + (task.subtasks ? countTasks(task.subtasks) : 0);
        }, 0);
    }

    // Count completed tasks (including subtasks)
    function countCompletedTasks(taskList) {
        return taskList.reduce((count, task) => {
            return count + (task.completed ? 1 : 0) + (task.subtasks ? countCompletedTasks(task.subtasks) : 0);
        }, 0);
    }

    // Update the task count in the status bar
    function updateTaskCount() {
        const totalCount = countTasks(tasks);
        const completedCount = countCompletedTasks(tasks);
        
        // Calculate total time spent on completed tasks
        let totalTimeSpent = 0;
        const completedTasks = tasks.filter(task => task.completed);
        completedTasks.forEach(task => {
            if (task.timeSpent) {
                totalTimeSpent += task.timeSpent;
            }
        });
        
        // Format time spent
        const timeSpentHours = Math.floor(totalTimeSpent / 3600);
        const timeSpentMinutes = Math.floor((totalTimeSpent % 3600) / 60);
        const timeSpentSeconds = totalTimeSpent % 60;
        
        let timeSpentStr = '';
        if (timeSpentHours > 0) {
            timeSpentStr += `${timeSpentHours}h `;
        }
        if (timeSpentMinutes > 0 || timeSpentHours > 0) {
            timeSpentStr += `${timeSpentMinutes}m `;
        }
        timeSpentStr += `${timeSpentSeconds}s`;
        
        taskCountEl.textContent = `Tasks: ${totalCount} total, ${completedCount} completed | Time in completed tasks: ${timeSpentStr}`;
    }



	
	// Render desktop tasks
    function renderDesktopTasks() {
        desktopEl.innerHTML = '';
        
        desktopTasks.forEach((task, index) => {
            const desktopTaskEl = document.createElement('div');
            desktopTaskEl.className = 'desktop-task';
            desktopTaskEl.setAttribute('data-desktop-id', index);
            
            // Position randomly on desktop if not already positioned
            if (!task.position) {
                task.position = {
                    left: Math.floor(Math.random() * (window.innerWidth - 250)) + 'px',
                    top: Math.floor(Math.random() * (window.innerHeight - 150)) + 'px'
                };
            }
            
            desktopTaskEl.style.left = task.position.left;
            desktopTaskEl.style.top = task.position.top;
            
            // Task title and content
            const taskTitle = document.createElement('div');
            taskTitle.textContent = task.text;
            taskTitle.style.fontWeight = 'bold';
            taskTitle.style.marginBottom = '5px';
            taskTitle.style.borderBottom = '1px solid #808080';
            taskTitle.style.paddingBottom = '3px';
            
            // Subtasks count
            const subtasksCount = task.subtasks ? task.subtasks.length : 0;
            const taskInfo = document.createElement('div');
            taskInfo.textContent = `${subtasksCount} subtask${subtasksCount !== 1 ? 's' : ''}`;
            taskInfo.style.fontSize = '12px';
            taskInfo.style.marginBottom = '5px';
            
            // Action buttons
            const actionButtons = document.createElement('div');
            actionButtons.style.display = 'flex';
            actionButtons.style.justifyContent = 'space-between';
            
            const restoreBtn = document.createElement('button');
            restoreBtn.textContent = 'Restore';
            restoreBtn.className = 'retro-button';
            restoreBtn.style.fontSize = '12px';
            restoreBtn.style.padding = '2px 5px';
            
            restoreBtn.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent drag
                // Restore task to main list
                const restoredTask = desktopTasks[index];
                tasks.push(restoredTask);
                
                // Remove from desktop
                desktopTasks.splice(index, 1);
                saveDesktopTasksToLocalStorage();
                renderDesktopTasks();
                
                // Update main task list
                saveTasksToLocalStorage();
                renderTasks();
            });
            
            const deleteBtn = document.createElement('button');
            deleteBtn.textContent = 'Delete';
            deleteBtn.className = 'retro-button';
            deleteBtn.style.fontSize = '12px';
            deleteBtn.style.padding = '2px 5px';
            
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent drag
                if (confirm('Are you sure you want to delete this task from the desktop?')) {
                    desktopTasks.splice(index, 1);
                    saveDesktopTasksToLocalStorage();
                    renderDesktopTasks();
                }
            });
            
            actionButtons.appendChild(restoreBtn);
            actionButtons.appendChild(deleteBtn);
            
            desktopTaskEl.appendChild(taskTitle);
            desktopTaskEl.appendChild(taskInfo);
            desktopTaskEl.appendChild(actionButtons);
            
            // Make desktop task draggable
            let isDraggingDesktopTask = false;
            let startX, startY;
            
            desktopTaskEl.addEventListener('mousedown', (e) => {
                // Only start drag if not clicking a button
                if (e.target.tagName !== 'BUTTON') {
                    isDraggingDesktopTask = true;
                    startX = e.clientX - desktopTaskEl.getBoundingClientRect().left;
                    startY = e.clientY - desktopTaskEl.getBoundingClientRect().top;
                    desktopTaskEl.style.zIndex = '100'; // Bring to front while dragging
                }
            });
            
            document.addEventListener('mousemove', (e) => {
                if (!isDraggingDesktopTask) return;
                
                const newLeft = e.clientX - startX;
                const newTop = e.clientY - startY;
                
                desktopTaskEl.style.left = `${newLeft}px`;
                desktopTaskEl.style.top = `${newTop}px`;
                
                // Update position in task data
                task.position = {
                    left: `${newLeft}px`,
                    top: `${newTop}px`
                };
            });
            
            document.addEventListener('mouseup', () => {
                if (isDraggingDesktopTask) {
                    isDraggingDesktopTask = false;
                    desktopTaskEl.style.zIndex = '5';
                    saveDesktopTasksToLocalStorage();
                }
            });
            
            desktopEl.appendChild(desktopTaskEl);
        });
    }
    
    // Render tasks based on the current filter
    function renderTasks() {
        taskListEl.innerHTML = '';
        
        // Filter tasks based on the current tab
        const filteredTasks = tasks.filter(task => {
            if (currentFilter === 'all') return true;
            if (currentFilter === 'active') return !task.completed;
            if (currentFilter === 'completed') return task.completed;
            return true;
        });
        
        // Render the filtered tasks
        filteredTasks.forEach(task => {
            renderTask(task);
        });
        
        // Add drop indicators between tasks
        addDropIndicators();
        updateTaskCount();
    }
    
    // Toggle subtasks visibility
    function toggleSubtasks(taskId) {
        const taskEl = document.querySelector(`[data-id="${taskId}"]`);
        if (!taskEl) return;
        
        const subtasksContainer = taskEl.querySelector('.subtasks');
        if (!subtasksContainer) return;
        
        const isHidden = subtasksContainer.classList.contains('hidden-subtasks');
        
        // Toggle the visibility
        if (isHidden) {
            subtasksContainer.classList.remove('hidden-subtasks');
            // Update the expand/collapse button
            const expandBtn = taskEl.querySelector('.task-actions div[title="Toggle subtasks"]');
            if (expandBtn) expandBtn.textContent = '▼';
        } else {
            subtasksContainer.classList.add('hidden-subtasks');
            // Update the expand/collapse button
            const expandBtn = taskEl.querySelector('.task-actions div[title="Toggle subtasks"]');
            if (expandBtn) expandBtn.textContent = '►';
        }
    }
    
    // Render a single task and its subtasks
    function renderTask(task, parentId = null, isSubtask = false) {
        const taskEl = document.createElement('div');
        taskEl.className = `task ${task.completed ? 'completed' : ''}`;
        taskEl.setAttribute('data-id', task.id);
        if (parentId) {
            taskEl.setAttribute('data-parent-id', parentId);
        }
        
        // Create task header (checkbox, text, actions)
        const taskHeader = document.createElement('div');
        taskHeader.className = 'task-header';
        
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'task-checkbox';
        checkbox.checked = task.completed;
        checkbox.addEventListener('change', () => {
            toggleTaskCompletion(task.id, parentId);
        });
        
        const taskTextEl = document.createElement('span');
        taskTextEl.textContent = task.text;
        taskTextEl.addEventListener('click', () => {
            selectTask(task.id, task.text);
        });
        
        const leftSide = document.createElement('div');
        leftSide.style.display = 'flex';
        leftSide.style.alignItems = 'center';
        leftSide.appendChild(checkbox);
        leftSide.appendChild(taskTextEl);
        
        if (selectedTaskId === task.id) {
            taskEl.style.backgroundColor = '#aaddff';
        }
        
        // Highlight the task if it's currently assigned to the timer
        if (timerAssignedTaskId === task.id) {
            taskEl.classList.add('timer-active');
            
            // Add a timer icon if the timer is running
            if (isTimerRunning && isWorkTime) {
                const timerIconEl = document.createElement('span');
                timerIconEl.className = 'timer-icon';
                timerIconEl.title = 'Timer is tracking this task';
                leftSide.appendChild(timerIconEl);
            }
        }
        
        // Time spent indicator if there is any
        if (task.timeSpent > 0) {
            const timeSpentEl = document.createElement('span');
            const minutes = Math.floor(task.timeSpent / 60);
            const seconds = task.timeSpent % 60;
            
            // Format the time display more clearly
            if (minutes > 0) {
                timeSpentEl.textContent = `(${minutes}m ${seconds}s)`;
            } else {
                timeSpentEl.textContent = `(${seconds}s)`;
            }
            
            timeSpentEl.style.marginLeft = '5px';
            timeSpentEl.style.fontSize = '12px';
            timeSpentEl.style.color = '#666';
            leftSide.appendChild(timeSpentEl);
        }
        
        const taskActions = document.createElement('div');
        taskActions.className = 'task-actions';
        
        // Add subtask button
        const addSubtaskBtn = document.createElement('div');
        addSubtaskBtn.className = 'task-action';
        addSubtaskBtn.textContent = '⤵';
        addSubtaskBtn.title = 'Add subtask';
        addSubtaskBtn.style.fontWeight = 'bold';
        addSubtaskBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            addSubtask(task.id);
        });
        
        // Add expand/collapse button if task has subtasks
        const expandBtn = document.createElement('div');
        expandBtn.className = 'task-action';
        // Only show this button if there are subtasks
        expandBtn.style.display = task.subtasks && task.subtasks.length > 0 ? 'block' : 'none';
        expandBtn.textContent = task.subtasks && task.subtasks.length > 0 ? '▼' : '►';
        expandBtn.title = 'Toggle subtasks';
        expandBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleSubtasks(task.id);
        });
        
        // Delete task button
        const deleteBtn = document.createElement('div');
        deleteBtn.className = 'task-action';
        deleteBtn.textContent = '×';
        deleteBtn.title = 'Delete task';
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (confirm('Are you sure you want to delete this task?')) {
                deleteTask(task.id, parentId);
            }
        });
        
        taskActions.appendChild(expandBtn);
        taskActions.appendChild(addSubtaskBtn);
        taskActions.appendChild(deleteBtn);
        
        taskHeader.appendChild(leftSide);
        taskHeader.appendChild(taskActions);
        
        taskEl.appendChild(taskHeader);
        
        // Add drag and drop functionality - only for parent tasks, not subtasks
        if (!isSubtask) {
            taskEl.setAttribute('draggable', 'true');
            taskEl.addEventListener('dragstart', (e) => {
                // Store the task ID and mark that it's a parent task
                e.dataTransfer.setData('application/json', JSON.stringify({
                    taskId: task.id,
                    isParentTask: true
                }));
                
                draggedTask = {
                    id: task.id,
                    parentId: null
                };
                
                setTimeout(() => {
                    taskEl.classList.add('dragging');
                }, 0);
            });
            
            taskEl.addEventListener('dragend', () => {
                taskEl.classList.remove('dragging');
                draggedTask = null;
                
                // Hide all drop indicators
                document.querySelectorAll('.task-drop-indicator').forEach(indicator => {
                    indicator.classList.remove('visible');
                });
            });
            
            taskEl.addEventListener('dragover', (e) => {
                e.preventDefault();
                // Show drop indicator
                const indicator = taskEl.previousElementSibling;
                if (indicator && indicator.classList.contains('task-drop-indicator')) {
                    document.querySelectorAll('.task-drop-indicator').forEach(ind => {
                        ind.classList.remove('visible');
                    });
                    indicator.classList.add('visible');
                }
            });
            
            taskEl.addEventListener('drop', (e) => {
                e.preventDefault();
                if (!draggedTask) return;
                
                const targetTaskId = taskEl.getAttribute('data-id');
                const targetParentId = taskEl.getAttribute('data-parent-id');
                
                if (draggedTask.id !== targetTaskId) {
                    moveTask(draggedTask.id, draggedTask.parentId, targetTaskId, targetParentId);
                }
            });
        }
		
		 // Render subtasks if there are any
        if (task.subtasks && task.subtasks.length > 0) {
            // Add a visual class to indicate this task has subtasks
            taskEl.classList.add('has-subtasks');
            
            const subtasksContainer = document.createElement('div');
            subtasksContainer.className = 'subtasks';
            
            // Add a label to make it clear these are subtasks
            const subtasksLabel = document.createElement('div');
            subtasksLabel.textContent = `Subtasks (${task.subtasks.length}):`;
            subtasksLabel.style.fontWeight = 'bold';
            subtasksLabel.style.fontSize = '14px';
            subtasksLabel.style.marginBottom = '5px';
            subtasksLabel.style.backgroundColor = '#a9a9a9';
            subtasksLabel.style.padding = '2px 5px';
            subtasksContainer.appendChild(subtasksLabel);
            
            // Create a simple flat list of subtasks for better visibility
            const subtasksList = document.createElement('div');
            subtasksList.className = 'subtasks-list';
            
            task.subtasks.forEach(subtask => {
                const subtaskItem = document.createElement('div');
                subtaskItem.className = 'subtask-item';
                subtaskItem.style.backgroundColor = subtask.completed ? '#e0e0e0' : '#f5f5f5';
                
                // Checkbox for the subtask
                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.className = 'task-checkbox';
                checkbox.checked = subtask.completed;
                checkbox.addEventListener('change', () => {
                    toggleTaskCompletion(subtask.id, task.id);
                });
                
                // Subtask text
                const subtaskText = document.createElement('span');
                subtaskText.textContent = subtask.text;
                if (subtask.completed) {
                    subtaskText.style.textDecoration = 'line-through';
                    subtaskText.style.opacity = '0.7';
                }
                
                // Delete button for subtask
                const deleteSubtaskBtn = document.createElement('div');
                deleteSubtaskBtn.className = 'task-action';
                deleteSubtaskBtn.textContent = '×';
                deleteSubtaskBtn.title = 'Delete subtask';
                deleteSubtaskBtn.style.marginLeft = 'auto';
                deleteSubtaskBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (confirm('Are you sure you want to delete this subtask?')) {
                        deleteTask(subtask.id, task.id);
                    }
                });
                
                subtaskItem.appendChild(checkbox);
                subtaskItem.appendChild(subtaskText);
                subtaskItem.appendChild(deleteSubtaskBtn);
                subtasksList.appendChild(subtaskItem);
            });
            
            subtasksContainer.appendChild(subtasksList);
            taskEl.appendChild(subtasksContainer);
            
            // Initialize subtasks to be expanded by default
            subtasksContainer.classList.remove('hidden-subtasks');
        }
        
        taskListEl.appendChild(taskEl);
    }
    
    // Add drop indicators between tasks for drag & drop
    function addDropIndicators() {
        const taskEls = taskListEl.querySelectorAll('.task');
        Array.from(taskEls).forEach(taskEl => {
            // Skip subtasks for drop indicators
            if (!taskEl.hasAttribute('data-parent-id')) {
                const indicator = document.createElement('div');
                indicator.className = 'task-drop-indicator';
                taskListEl.insertBefore(indicator, taskEl);
            }
        });
        
        // Add a final indicator for dropping at the end of the list
        const finalIndicator = document.createElement('div');
        finalIndicator.className = 'task-drop-indicator';
        taskListEl.appendChild(finalIndicator);
        
        // Add event listeners to the indicators
        document.querySelectorAll('.task-drop-indicator').forEach(indicator => {
            indicator.addEventListener('dragover', (e) => {
                e.preventDefault();
                document.querySelectorAll('.task-drop-indicator').forEach(ind => {
                    ind.classList.remove('visible');
                });
                indicator.classList.add('visible');
            });
            
            indicator.addEventListener('drop', (e) => {
                e.preventDefault();
                const data = e.dataTransfer.getData('application/json');
                if (data) {
                    try {
                        const parsedData = JSON.parse(data);
                        if (parsedData.isParentTask) {
                            const taskId = parsedData.taskId;
                            
                            // Find the next task (if any)
                            const nextTask = indicator.nextElementSibling;
                            if (nextTask && nextTask.classList.contains('task')) {
                                const targetTaskId = nextTask.getAttribute('data-id');
                                
                                moveTaskBefore(taskId, null, targetTaskId, null);
                            } else {
                                // Dropping at the end of the list
                                moveTaskToEnd(taskId, null);
                            }
                        }
                    } catch (err) {
                        console.error('Error parsing dropped data:', err);
                    }
                }
                
                indicator.classList.remove('visible');
            });
        });
    }
    
    // Move a task before another task
    function moveTaskBefore(taskId, taskParentId, targetId, targetParentId) {
        // Get the task to move
        const taskToMove = findTaskById(taskId, taskParentId);
        if (!taskToMove) return;
        
        // Remove the task from its current position
        if (taskParentId) {
            const parentTask = findTaskById(taskParentId);
            if (parentTask) {
                parentTask.subtasks = parentTask.subtasks.filter(task => task.id !== taskId);
            }
        } else {
            tasks = tasks.filter(task => task.id !== taskId);
        }
        
        // Find where to insert the task
        if (targetParentId) {
            // Moving task to become a sibling of a subtask
            const targetParent = findTaskById(targetParentId);
            if (targetParent) {
                const targetIndex = targetParent.subtasks.findIndex(task => task.id === targetId);
                if (targetIndex !== -1) {
                    targetParent.subtasks.splice(targetIndex, 0, taskToMove);
                } else {
                    targetParent.subtasks.push(taskToMove);
                }
            }
        } else {
            // Moving task to become a main task
            const targetIndex = tasks.findIndex(task => task.id === targetId);
            if (targetIndex !== -1) {
                tasks.splice(targetIndex, 0, taskToMove);
            } else {
                tasks.push(taskToMove);
            }
        }
        
        saveTasksToLocalStorage();
        renderTasks();
    }
    
    // Move a task to the end of the list
    function moveTaskToEnd(taskId, taskParentId) {
        const taskToMove = findTaskById(taskId, taskParentId);
        if (!taskToMove) return;
        
        // Remove the task from its current position
        if (taskParentId) {
            const parentTask = findTaskById(taskParentId);
            if (parentTask) {
                parentTask.subtasks = parentTask.subtasks.filter(task => task.id !== taskId);
            }
        } else {
            tasks = tasks.filter(task => task.id !== taskId);
        }
        
        // Add the task to the end of the main task list
        tasks.push(taskToMove);
        
        saveTasksToLocalStorage();
        renderTasks();
    }
    
    // Move a task to a new position
    function moveTask(taskId, taskParentId, targetId, targetParentId) {
        const taskToMove = findTaskById(taskId, taskParentId);
        const targetTask = findTaskById(targetId, targetParentId);
        
        if (!taskToMove || !targetTask) return;
        
        // Remove the task from its current position
        if (taskParentId) {
            const parentTask = findTaskById(taskParentId);
            if (parentTask) {
                parentTask.subtasks = parentTask.subtasks.filter(task => task.id !== taskId);
            }
        } else {
            tasks = tasks.filter(task => task.id !== taskId);
        }
        
        // Add the task to its new position
        if (targetParentId) {
            // Target is a subtask, so we'll add the task as a sibling
            const targetParent = findTaskById(targetParentId);
            if (targetParent) {
                const targetIndex = targetParent.subtasks.findIndex(task => task.id === targetId);
                if (targetIndex !== -1) {
                    targetParent.subtasks.splice(targetIndex + 1, 0, taskToMove);
                } else {
                    targetParent.subtasks.push(taskToMove);
                }
            }
        } else {
            // Target is a main task, so we'll add the task after it
            const targetIndex = tasks.findIndex(task => task.id === targetId);
            if (targetIndex !== -1) {
                tasks.splice(targetIndex + 1, 0, taskToMove);
            } else {
                tasks.push(taskToMove);
            }
        }
        
        saveTasksToLocalStorage();
        renderTasks();
    }
	
	// Timer functionality
    function updateTimerDisplay() {
        const minutes = Math.floor(timeLeft / 60);
        const seconds = timeLeft % 60;
        timerDisplayEl.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        
        // Change color based on work/break time
        timerDisplayEl.style.color = isWorkTime ? '#00ff00' : '#ff9900';
    }
    
    function toggleTimer() {
        if (isTimerRunning) {
            // Pause timer
            clearInterval(timerInterval);
            startTimerBtn.textContent = 'Start';
        } else {
            // Start timer
            timerInterval = setInterval(updateTimer, 1000);
            startTimerBtn.textContent = 'Pause';
        }
        
        isTimerRunning = !isTimerRunning;
        renderTasks(); // Update task appearance if timer is assigned
    }
    
    function resetTimer() {
        clearInterval(timerInterval);
        isTimerRunning = false;
        startTimerBtn.textContent = 'Start';
        
        // Set back to work time
        isWorkTime = true;
        timeLeft = parseInt(workTimeInput.value) * 60;
        
        updateTimerDisplay();
        renderTasks(); // Update task appearance
    }
    
    function updateTimerSettings() {
        // Update timer settings
        if (!isTimerRunning) {
            if (isWorkTime) {
                timeLeft = parseInt(workTimeInput.value) * 60;
            } else {
                timeLeft = parseInt(breakTimeInput.value) * 60;
            }
            updateTimerDisplay();
        }
    }
    
    function updateTimer() {
        if (timeLeft > 0) {
            timeLeft--;
            
            // Update time spent on the assigned task if it's work time
            if (isWorkTime && timerAssignedTaskId) {
                const task = findTaskById(timerAssignedTaskId);
                if (task) {
                    task.timeSpent = (task.timeSpent || 0) + 1; // Add 1 second
                    saveTasksToLocalStorage();
                    
                    // Re-render tasks to update the time display
                    if (timeLeft % 5 === 0) { // Only update UI every 5 seconds for performance
                        renderTasks();
                    }
                } else {
                    // Task no longer exists, clear the assignment
                    timerAssignedTaskId = null;
                    timerStatusEl.textContent = 'Timer not assigned';
                    localStorage.removeItem('retroTodoTimerAssignment');
                }
            }
        } else {
            // Timer finished
            clearInterval(timerInterval);
            isTimerRunning = false;
            startTimerBtn.textContent = 'Start';
            
            // Play notification sound
            const audio = new Audio('data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YU' + Array(1000).join('A'));
            audio.play().catch(e => console.error('Audio play failed:', e));
            
            // Toggle between work and break
            isWorkTime = !isWorkTime;
            
            // Reset the timer
            if (isWorkTime) {
                timeLeft = parseInt(workTimeInput.value) * 60;
            } else {
                timeLeft = parseInt(breakTimeInput.value) * 60;
            }
            
            // Update UI to reflect timer status
            renderTasks();
        }
        
        updateTimerDisplay();
    }
    
    // Select a task for the timer
    function selectTask(taskId, taskText) {
        selectedTaskId = taskId;
        currentTaskNameEl.textContent = taskText;
        renderTasks(); // Re-render to show the selected task with highlighting
    }
    
    // Assign timer to a task
    function assignTimerToTask() {
        if (!selectedTaskId) {
            alert('Please select a task first!');
            return;
        }
        
        const selectedTask = findTaskById(selectedTaskId);
        if (!selectedTask) {
            alert('Selected task no longer exists!');
            return;
        }
        
        // Confirm if the user wants to reset an ongoing timer
        if (isTimerRunning && !confirm('Timer is running. Assigning to a new task will reset the timer. Continue?')) {
            return;
        }
        
        // Ask if the user wants to reset the timer
        const shouldResetTimer = isTimerRunning || confirm('Reset timer before assigning?');
        
        // Assign the timer to the selected task
        timerAssignedTaskId = selectedTaskId;
        timerStatusEl.textContent = `Timer assigned to: ${selectedTask.text}`;
        
        // Save the timer assignment to localStorage
        localStorage.setItem('retroTodoTimerAssignment', timerAssignedTaskId);
        
        // Reset the timer if needed
        if (shouldResetTimer) {
            resetTimer();
        }
        
        // Update the UI
        renderTasks();
    }
    
    // Update date and time in the status bar
    function updateDateTime() {
        const now = new Date();
        const timeString = now.toLocaleTimeString();
        const dateString = now.toLocaleDateString();
        timeDateEl.textContent = `${timeString} | ${dateString}`;
    }
    
    // Initialize the app
    init();
});
	
	
	