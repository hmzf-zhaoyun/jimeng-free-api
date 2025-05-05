import fs from 'fs-extra';
import path from 'path';
import _ from 'lodash';

import logger from '../logger.ts';
import environment from '../environment.ts';

// 会话存储文件路径
const SESSION_STORE_PATH = path.join(path.resolve(), 'data', 'sessions.json');

/**
 * 会话管理器
 */
class SessionManager {
    // 会话数据
    private sessions: Array<{
        id: string;
        name: string;
        createdAt: number;
        updatedAt: number;
        active: boolean;
    }> = [];
    // 初始化标志
    private initialized: boolean = false;

    /**
     * 初始化会话管理器
     */
    async initialize() {
        if (this.initialized) return;
        
        // 确保data目录存在
        await fs.ensureDir(path.dirname(SESSION_STORE_PATH));
        
        // 如果文件不存在，创建空的会话存储文件
        if (!await fs.pathExists(SESSION_STORE_PATH)) {
            await fs.writeJson(SESSION_STORE_PATH, [], { spaces: 2 });
        }
        
        try {
            // 加载会话数据
            this.sessions = await fs.readJson(SESSION_STORE_PATH);
            logger.info(`已加载 ${this.sessions.length} 个会话ID`);
            
            // 加载环境变量中的会话ID
            const envSessionIds = this.getEnvironmentSessionIds();
            if (envSessionIds.length > 0) {
                logger.info(`从环境变量加载了 ${envSessionIds.length} 个会话ID`);
                // 将环境变量中的会话ID添加到会话数据中（如果不存在）
                for (const sessionId of envSessionIds) {
                    const exists = this.sessions.some(session => session.id === sessionId);
                    if (!exists) {
                        this.sessions.push({
                            id: sessionId,
                            name: '从环境变量导入',
                            createdAt: Date.now(),
                            updatedAt: Date.now(),
                            active: true
                        });
                    }
                }
                // 保存更新后的会话数据
                await this.save();
            }
            
            this.initialized = true;
        } catch (err) {
            logger.error('加载会话数据失败:', err);
            // 如果加载失败，创建空的会话数据
            this.sessions = [];
            // 尝试从环境变量加载
            const envSessionIds = this.getEnvironmentSessionIds();
            if (envSessionIds.length > 0) {
                logger.info(`从环境变量加载了 ${envSessionIds.length} 个会话ID`);
                for (const sessionId of envSessionIds) {
                    this.sessions.push({
                        id: sessionId,
                        name: '从环境变量导入',
                        createdAt: Date.now(),
                        updatedAt: Date.now(),
                        active: true
                    });
                }
                // 保存会话数据
                await this.save();
            }
            this.initialized = true;
        }
    }
    
    /**
     * 从环境变量获取会话ID
     */
    getEnvironmentSessionIds(): string[] {
        const envSessionId = environment.envVars.SESSION_ID;
        if (envSessionId) {
            return envSessionId.split(',').map(id => id.trim()).filter(id => id);
        }
        return [];
    }
    
    /**
     * 保存会话数据到文件
     */
    async save() {
        try {
            await fs.writeJson(SESSION_STORE_PATH, this.sessions, { spaces: 2 });
            logger.debug('会话数据保存成功');
            return true;
        } catch (err) {
            logger.error('保存会话数据失败:', err);
            return false;
        }
    }
    
    /**
     * 获取所有会话
     */
    async getAllSessions() {
        if (!this.initialized) await this.initialize();
        return _.cloneDeep(this.sessions);
    }
    
    /**
     * 获取所有活跃会话ID
     */
    async getActiveSessionIds() {
        if (!this.initialized) await this.initialize();
        return this.sessions
            .filter(session => session.active)
            .map(session => session.id);
    }
    
    /**
     * 添加会话
     * @param sessionId 会话ID
     * @param name 会话名称
     */
    async addSession(sessionId: string, name: string = '手动添加') {
        if (!this.initialized) await this.initialize();
        
        // 检查会话ID是否已存在
        const existingIndex = this.sessions.findIndex(session => session.id === sessionId);
        if (existingIndex !== -1) {
            // 更新现有会话
            this.sessions[existingIndex] = {
                ...this.sessions[existingIndex],
                name,
                updatedAt: Date.now(),
                active: true
            };
        } else {
            // 添加新会话
            this.sessions.push({
                id: sessionId,
                name,
                createdAt: Date.now(),
                updatedAt: Date.now(),
                active: true
            });
        }
        
        // 保存更新后的会话数据
        return await this.save();
    }
    
    /**
     * 更新会话
     * @param sessionId 会话ID
     * @param data 更新数据
     */
    async updateSession(sessionId: string, data: { name?: string; active?: boolean }) {
        if (!this.initialized) await this.initialize();
        
        const index = this.sessions.findIndex(session => session.id === sessionId);
        if (index === -1) {
            return false;
        }
        
        // 更新会话数据
        this.sessions[index] = {
            ...this.sessions[index],
            ...data,
            updatedAt: Date.now()
        };
        
        // 保存更新后的会话数据
        return await this.save();
    }
    
    /**
     * 删除会话
     * @param sessionId 会话ID
     */
    async deleteSession(sessionId: string) {
        if (!this.initialized) await this.initialize();
        
        const initialLength = this.sessions.length;
        this.sessions = this.sessions.filter(session => session.id !== sessionId);
        
        if (this.sessions.length === initialLength) {
            return false; // 未找到要删除的会话
        }
        
        // 保存更新后的会话数据
        return await this.save();
    }
    
    /**
     * 获取随机活跃会话ID
     */
    async getRandomSessionId() {
        if (!this.initialized) await this.initialize();
        
        const activeSessions = this.sessions.filter(session => session.active);
        if (activeSessions.length === 0) {
            // 如果没有活跃会话，尝试从环境变量获取
            const envSessionIds = this.getEnvironmentSessionIds();
            if (envSessionIds.length > 0) {
                return _.sample(envSessionIds);
            }
            return null;
        }
        
        return _.sample(activeSessions)?.id || null;
    }
}

export default new SessionManager(); 