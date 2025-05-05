/**
 * 即梦API - SessionID管理页面
 * 
 * 功能:
 * - 获取、添加、编辑、删除SessionID
 * - 测试SessionID有效性
 */

// 全局变量
const API_BASE_URL = '/v1'; // 修改为与后端路由前缀匹配
const sessionsTableBody = document.getElementById('sessionsTableBody');
const refreshSessionsBtn = document.getElementById('refreshSessionsBtn');
const addSessionForm = document.getElementById('addSessionForm');
const testSessionBtn = document.getElementById('testSessionBtn');
const addSessionResult = document.getElementById('addSessionResult');
const editSessionModal = new bootstrap.Modal(document.getElementById('editSessionModal'));
const deleteSessionModal = new bootstrap.Modal(document.getElementById('deleteSessionModal'));
const saveEditSessionBtn = document.getElementById('saveEditSessionBtn');
const confirmDeleteSessionBtn = document.getElementById('confirmDeleteSessionBtn');

// 页面加载时执行
document.addEventListener('DOMContentLoaded', () => {
  // 加载会话列表
  loadSessions();

  // 绑定事件
  setupEventListeners();
});

/**
 * 设置事件监听器
 */
function setupEventListeners() {
  // 刷新按钮点击事件
  refreshSessionsBtn.addEventListener('click', loadSessions);

  // 添加会话表单提交事件
  addSessionForm.addEventListener('submit', handleAddSession);

  // 测试会话按钮点击事件
  testSessionBtn.addEventListener('click', handleTestSession);

  // 保存编辑会话按钮点击事件
  saveEditSessionBtn.addEventListener('click', handleSaveEditSession);

  // 确认删除会话按钮点击事件
  confirmDeleteSessionBtn.addEventListener('click', handleDeleteSession);
}

/**
 * 使用超时和重试机制执行fetch请求
 * @param {string} url 请求URL
 * @param {Object} options fetch选项
 * @param {number} timeout 超时时间（毫秒）
 * @param {number} retries 最大重试次数
 * @returns {Promise<Response>} fetch响应
 */
async function fetchWithTimeout(url, options = {}, timeout = 10000, retries = 2) {
  let currentAttempt = 0;

  while (currentAttempt <= retries) {
    try {
      // 使用AbortController实现超时控制
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const fetchOptions = {
        ...options,
        signal: controller.signal
      };

      const response = await fetch(url, fetchOptions);
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      currentAttempt++;

      // 如果是超时错误或网络错误，并且还有重试次数，则继续重试
      if ((error.name === 'AbortError' || error.name === 'TypeError') && currentAttempt <= retries) {
        console.warn(`请求失败，正在重试 (${currentAttempt}/${retries})...`);
        // 可以在这里添加延迟，例如：await new Promise(r => setTimeout(r, 1000));
        continue;
      }

      // 其他错误或已达到最大重试次数，则抛出错误
      throw error;
    }
  }
}

/**
 * 加载会话列表
 */
async function loadSessions() {
  try {
    showLoading(refreshSessionsBtn);

    // 使用带有超时和重试的fetch
    const response = await fetchWithTimeout(`${API_BASE_URL}/admin/sessions`);

    // 首先检查响应状态
    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage;
      try {
        // 尝试将错误响应解析为JSON
        const errorData = JSON.parse(errorText);
        errorMessage = errorData.message || '未知错误';
      } catch (parseError) {
        // 如果解析失败，使用原始错误文本
        console.error('解析错误响应失败:', parseError);
        errorMessage = errorText || `HTTP错误 ${response.status}`;
      }
      showErrorMessage('加载会话列表失败：' + errorMessage);
      return;
    }

    // 获取响应文本并在解析前检查是否为空
    const responseText = await response.text();
    if (!responseText.trim()) {
      showErrorMessage('加载会话列表失败：服务器返回了空响应');
      return;
    }

    // 尝试解析JSON
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (jsonError) {
      console.error('解析JSON响应失败:', jsonError, '原始响应:', responseText);
      showErrorMessage('加载会话列表失败：无法解析服务器响应');
      return;
    }

    // 处理解析后的数据
    renderSessionsTable(data.sessions);
  } catch (error) {
    console.error('加载会话列表失败:', error);
    showErrorMessage('加载会话列表失败：' + (error.message || '网络错误'));
  } finally {
    hideLoading(refreshSessionsBtn, '<i class="bi bi-arrow-clockwise"></i> 刷新');
  }
}

/**
 * 渲染会话表格
 * @param {Array} sessions 会话列表
 */
function renderSessionsTable(sessions) {
  sessionsTableBody.innerHTML = '';

  if (!sessions || sessions.length === 0) {
    const emptyRow = document.createElement('tr');
    emptyRow.innerHTML = `<td colspan="5" class="text-center py-4">暂无会话数据</td>`;
    sessionsTableBody.appendChild(emptyRow);
    return;
  }

  sessions.forEach(session => {
    const row = document.createElement('tr');

    // 格式化时间
    const createdDate = new Date(session.createdAt);
    const formattedDate = createdDate.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });

    row.innerHTML = `
            <td>${session.name}</td>
            <td class="session-id-cell" title="${session.id}">${session.id}</td>
            <td><span class="session-status ${session.active ? 'session-active' : 'session-inactive'}">${session.active ? '活跃' : '停用'}</span></td>
            <td>${formattedDate}</td>
            <td>
                <div class="btn-group btn-group-sm">
                    <button type="button" class="btn btn-outline-primary edit-session" data-id="${session.id}" data-name="${session.name}" data-active="${session.active}">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button type="button" class="btn btn-outline-danger delete-session" data-id="${session.id}">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>
            </td>
        `;

    sessionsTableBody.appendChild(row);
  });

  // 添加编辑按钮点击事件
  document.querySelectorAll('.edit-session').forEach(button => {
    button.addEventListener('click', () => {
      const sessionId = button.getAttribute('data-id');
      const sessionName = button.getAttribute('data-name');
      const sessionActive = button.getAttribute('data-active') === 'true';

      // 填充表单
      document.getElementById('editSessionId').value = sessionId;
      document.getElementById('editSessionName').value = sessionName;
      document.getElementById('editSessionActive').checked = sessionActive;

      // 显示模态框
      editSessionModal.show();
    });
  });

  // 添加删除按钮点击事件
  document.querySelectorAll('.delete-session').forEach(button => {
    button.addEventListener('click', () => {
      const sessionId = button.getAttribute('data-id');

      // 填充表单
      document.getElementById('deleteSessionId').value = sessionId;

      // 显示模态框
      deleteSessionModal.show();
    });
  });
}

/**
 * 添加会话处理
 * @param {Event} event 表单提交事件
 */
async function handleAddSession(event) {
  event.preventDefault();

  const sessionId = document.getElementById('sessionId').value.trim();
  const sessionName = document.getElementById('sessionName').value.trim() || '手动添加';

  if (!sessionId) {
    showAddSessionResult('请输入SessionID', 'danger');
    return;
  }

  try {
    const submitBtn = addSessionForm.querySelector('button[type="submit"]');
    showLoading(submitBtn);

    const response = await fetchWithTimeout(`${API_BASE_URL}/admin/sessions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        sessionId,
        name: sessionName
      })
    });

    const responseText = await response.text();
    const data = responseText ? JSON.parse(responseText) : {};

    if (response.ok) {
      showAddSessionResult('SessionID添加成功', 'success');
      addSessionForm.reset();
      loadSessions();
    } else {
      showAddSessionResult(`添加失败：${data.message || '未知错误'}`, 'danger');
    }
  } catch (error) {
    console.error('添加会话失败:', error);
    showAddSessionResult(`添加失败：${error.message || '网络错误'}`, 'danger');
  } finally {
    const submitBtn = addSessionForm.querySelector('button[type="submit"]');
    hideLoading(submitBtn, '<i class="bi bi-plus-lg"></i> 添加');
  }
}

/**
 * 测试会话ID有效性
 */
async function handleTestSession() {
  const sessionId = document.getElementById('sessionId').value.trim();

  if (!sessionId) {
    showAddSessionResult('请输入SessionID进行测试', 'warning');
    return;
  }

  try {
    showLoading(testSessionBtn);

    const response = await fetchWithTimeout(`${API_BASE_URL}/admin/test-session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ sessionId })
    });

    const responseText = await response.text();
    const data = responseText ? JSON.parse(responseText) : {};

    if (response.ok) {
      if (data.valid) {
        showAddSessionResult('SessionID有效，可以添加', 'success');
      } else {
        showAddSessionResult(`SessionID无效：${data.error || '验证失败'}`, 'danger');
      }
    } else {
      showAddSessionResult(`测试失败：${data.message || '未知错误'}`, 'danger');
    }
  } catch (error) {
    console.error('测试会话失败:', error);
    showAddSessionResult(`测试失败：${error.message || '网络错误'}`, 'danger');
  } finally {
    hideLoading(testSessionBtn, '<i class="bi bi-check-circle"></i> 测试有效性');
  }
}

/**
 * 保存编辑的会话
 */
async function handleSaveEditSession() {
  const sessionId = document.getElementById('editSessionId').value;
  const sessionName = document.getElementById('editSessionName').value.trim();
  const sessionActive = document.getElementById('editSessionActive').checked;

  try {
    showLoading(saveEditSessionBtn);

    const response = await fetchWithTimeout(`${API_BASE_URL}/admin/sessions/${sessionId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: sessionName,
        active: sessionActive
      })
    });

    const responseText = await response.text();
    const data = responseText ? JSON.parse(responseText) : {};

    if (response.ok) {
      editSessionModal.hide();
      loadSessions();
    } else {
      alert(`更新失败：${data.message || '未知错误'}`);
    }
  } catch (error) {
    console.error('更新会话失败:', error);
    alert(`更新失败：${error.message || '网络错误'}`);
  } finally {
    hideLoading(saveEditSessionBtn, '保存');
  }
}

/**
 * 删除会话
 */
async function handleDeleteSession() {
  const sessionId = document.getElementById('deleteSessionId').value;

  try {
    showLoading(confirmDeleteSessionBtn);

    const response = await fetchWithTimeout(`${API_BASE_URL}/admin/sessions/${sessionId}`, {
      method: 'DELETE'
    });

    const responseText = await response.text();
    const data = responseText ? JSON.parse(responseText) : {};

    if (response.ok) {
      deleteSessionModal.hide();
      loadSessions();
    } else {
      alert(`删除失败：${data.message || '未知错误'}`);
    }
  } catch (error) {
    console.error('删除会话失败:', error);
    alert(`删除失败：${error.message || '网络错误'}`);
  } finally {
    hideLoading(confirmDeleteSessionBtn, '删除');
  }
}

/**
 * 显示添加会话结果消息
 * @param {string} message 消息内容
 * @param {string} type 消息类型（success, danger, warning, info）
 */
function showAddSessionResult(message, type = 'info') {
  addSessionResult.innerHTML = `<div class="alert alert-${type} mb-0">${message}</div>`;
  addSessionResult.classList.remove('d-none');

  // 5秒后自动隐藏
  setTimeout(() => {
    addSessionResult.classList.add('d-none');
  }, 5000);
}

/**
 * 显示全局错误消息
 * @param {string} message 错误消息
 */
function showErrorMessage(message) {
  const errorAlert = document.createElement('div');
  errorAlert.className = 'alert alert-danger alert-dismissible fade show fixed-top m-3';
  errorAlert.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;

  document.body.appendChild(errorAlert);

  // 5秒后自动隐藏
  setTimeout(() => {
    errorAlert.remove();
  }, 5000);
}

/**
 * 显示加载状态
 * @param {HTMLElement} button 按钮元素
 */
function showLoading(button) {
  button.disabled = true;
  button.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> 处理中...';
}

/**
 * 隐藏加载状态
 * @param {HTMLElement} button 按钮元素
 * @param {string} originalText 原始按钮文本
 */
function hideLoading(button, originalText) {
  button.disabled = false;
  button.innerHTML = originalText;
} 