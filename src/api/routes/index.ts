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
    {
        get: {
            '/admin': async () => {
                return new Response(null, {
                    redirect: '/v1/admin'
                });
            },
            '/admin/*': async (request) => {
                // 提取 /admin/ 后的路径
                const path = request.url.split('/admin/')[1];
                return new Response(null, {
                    redirect: `/v1/admin/${path}`
                });
            }
        }
    },
    {
        get: {
            '/v1/admin/index.html': async () => {
                const content = await fs.readFile('public/admin/index.html');
                return new Response(content, {
                    type: 'html',
                    headers: {
                        Expires: '-1'
                    }
                });
            },
            '/v1/admin/js/*': async (request) => {
                // 提取 /v1/admin/js/ 后的路径
                const path = request.url.split('/v1/admin/js/')[1];
                const content = await fs.readFile(`public/admin/js/${path}`);
                return new Response(content, {
                    type: 'js',
                    headers: {
                        Expires: '-1'
                    }
                });
            },
            '/v1/admin/css/*': async (request) => {
                // 提取 /v1/admin/css/ 后的路径
                const path = request.url.split('/v1/admin/css/')[1];
                const content = await fs.readFile(`public/admin/css/${path}`);
                return new Response(content, {
                    type: 'css',
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