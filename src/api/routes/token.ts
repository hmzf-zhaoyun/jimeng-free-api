import _ from 'lodash';

import Request from '@/lib/request/Request.ts';
import Response from '@/lib/response/Response.ts';
import { getTokenLiveStatus, getCredit, tokenSplitWithManager } from '@/api/controllers/core.ts';
import logger from '@/lib/logger.ts';
import APIException from '@/lib/exceptions/APIException.ts';
import EX from '@/api/consts/exceptions.ts';

export default {

    prefix: '/token',

    post: {

        '/check': async (request: Request) => {
            request
                .validate('body.token', _.isString)
            const live = await getTokenLiveStatus(request.body.token);
            return {
                live
            }
        },

        '/points': async (request: Request) => {
            // 移除对 authorization 头的强制验证
            
            // refresh_token切分，不再要求 authorization 头必须存在
            const tokens = await tokenSplitWithManager(request.headers.authorization);
            
            // 检查是否有可用的会话ID
            if (tokens.length === 0) {
                throw new APIException(EX.API_REQUEST_FAILED, '没有可用的会话ID，请通过环境变量设置SESSION_ID或者在管理页面添加并激活会话ID');
            }
            
            const points = await Promise.all(tokens.map(async (token) => {
                return {
                    token,
                    points: await getCredit(token)
                }
            }))
            return points;
        }

    }

}