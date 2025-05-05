import _ from 'lodash';

import Request from '@/lib/request/Request.ts';
import Response from '@/lib/response/Response.ts';
import { tokenSplitWithManager } from '@/api/controllers/core.ts';
import { createCompletion, createCompletionStream } from '@/api/controllers/chat.ts';
import APIException from '@/lib/exceptions/APIException.ts';
import EX from '@/api/consts/exceptions.ts';

export default {

    prefix: '/v1/chat',

    post: {

        '/completions': async (request: Request) => {
            request
                .validate('body.model', v => _.isUndefined(v) || _.isString(v))
                .validate('body.messages', _.isArray)

            // refresh_token切分，不再要求 authorization 头必须存在
            const tokens = await tokenSplitWithManager(request.headers.authorization);
            
            // 检查是否有可用的会话ID
            if (tokens.length === 0) {
                throw new APIException(EX.API_REQUEST_FAILED, '没有可用的会话ID，请通过环境变量设置SESSION_ID或者在管理页面添加并激活会话ID');
            }
            
            // 随机挑选一个refresh_token
            const token = _.sample(tokens);
            const { model, messages, stream } = request.body;
            if (stream) {
                const stream = await createCompletionStream(messages, token, model);
                return new Response(stream, {
                    type: "text/event-stream"
                });
            }
            else
                return await createCompletion(messages, token, model);
        }

    }

}