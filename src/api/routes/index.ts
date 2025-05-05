import fs from 'fs-extra';

import Response from '@/lib/response/Response.ts';
import images from "./images.ts";
import chat from "./chat.ts";
import ping from "./ping.ts";
import token from './token.ts';
import models from './models.ts';
import admin from './admin.ts';
import sessionManager from '@/lib/managers/session-manager.ts';

// 初始化sessionManager
sessionManager.initialize();

export default [
    {
        get: {
            '/': async () => {
                const content = await fs.readFile('public/welcome.html');
                return new Response(content, {
                    type: 'html',
                    headers: {
                        Expires: '-1'
                    }
                });
            }
        }
    },
    images,
    chat,
    ping,
    token,
    models,
    admin
];