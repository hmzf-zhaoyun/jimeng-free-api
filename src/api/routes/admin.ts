import _ from 'lodash';

import Request from '@/lib/request/Request.ts';
import Response from '@/lib/response/Response.ts';
import APIException from '@/lib/exceptions/APIException.ts';
import EX from '@/api/consts/exceptions.ts';
import sessionManager from '@/lib/managers/session-manager.ts';
import { getTokenLiveStatus } from '@/api/controllers/core.ts';
import logger from '@/lib/logger.ts';

export default {
    prefix: '/admin',

    get: {
        // 管理页面入口
        '/': async () => {
            // 返回管理页面
            return new Response(null, {
                redirect: '/admin/index.html'
            });
        },

        // 获取所有会话
        '/sessions': async (request: Request) => {
            const sessions = await sessionManager.getAllSessions();
            return { sessions };
        }
    },

    post: {
        // 添加会话
        '/sessions': async (request: Request) => {
            request
                .validate('body.sessionId', _.isString)
                .validate('body.name', v => _.isUndefined(v) || _.isString(v));
            
            const { sessionId, name } = request.body;
            
            // 验证会话ID是否有效
            try {
                const isValid = await getTokenLiveStatus(sessionId);
                if (!isValid) {
                    throw new APIException(EX.API_REQUEST_PARAMS_INVALID, '会话ID无效');
                }
            } catch (err) {
                throw new APIException(EX.API_REQUEST_PARAMS_INVALID, '会话ID无效');
            }
            
            // 添加会话
            const success = await sessionManager.addSession(sessionId, name || '手动添加');
            
            if (!success) {
                throw new APIException(EX.API_REQUEST_FAILED, '添加会话失败');
            }
            
            return { success: true };
        },

        // 测试会话ID是否有效
        '/test-session': async (request: Request) => {
            request.validate('body.sessionId', _.isString);
            
            const { sessionId } = request.body;
            
            try {
                const isValid = await getTokenLiveStatus(sessionId);
                return { valid: isValid };
            } catch (err) {
                return { valid: false, error: err.message };
            }
        }
    },

    put: {
        // 更新会话
        '/sessions/:sessionId': async (request: Request) => {
            request
                .validate('params.sessionId', _.isString)
                .validate('body.name', v => _.isUndefined(v) || _.isString(v))
                .validate('body.active', v => _.isUndefined(v) || _.isBoolean(v));
            
            const { sessionId } = request.params;
            const { name, active } = request.body;
            
            // 更新数据
            const updateData: any = {};
            if (!_.isUndefined(name)) updateData.name = name;
            if (!_.isUndefined(active)) updateData.active = active;
            
            // 如果没有要更新的数据，返回错误
            if (_.isEmpty(updateData)) {
                throw new APIException(EX.API_REQUEST_PARAMS_INVALID, '没有要更新的数据');
            }
            
            // 更新会话
            const success = await sessionManager.updateSession(sessionId, updateData);
            
            if (!success) {
                throw new APIException(EX.API_REQUEST_FAILED, '会话不存在或更新失败');
            }
            
            return { success: true };
        }
    },

    delete: {
        // 删除会话
        '/sessions/:sessionId': async (request: Request) => {
            request.validate('params.sessionId', _.isString);
            
            const { sessionId } = request.params;
            
            // 删除会话
            const success = await sessionManager.deleteSession(sessionId);
            
            if (!success) {
                throw new APIException(EX.API_REQUEST_FAILED, '会话不存在或删除失败');
            }
            
            return { success: true };
        }
    }
}; 