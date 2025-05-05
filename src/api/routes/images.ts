import _ from "lodash";

import Request from "@/lib/request/Request.ts";
import { generateImages } from "@/api/controllers/images.ts";
import { tokenSplitWithManager } from "@/api/controllers/core.ts";
import util from "@/lib/util.ts";
import APIException from '@/lib/exceptions/APIException.ts';
import EX from '@/api/consts/exceptions.ts';

export default {
  prefix: "/v1/images",

  post: {
    "/generations": async (request: Request) => {
      request
        .validate("body.model", v => _.isUndefined(v) || _.isString(v))
        .validate("body.prompt", _.isString)
        .validate("body.negative_prompt", v => _.isUndefined(v) || _.isString(v))
        .validate("body.width", v => _.isUndefined(v) || _.isFinite(v))
        .validate("body.height", v => _.isUndefined(v) || _.isFinite(v))
        .validate("body.sample_strength", v => _.isUndefined(v) || _.isFinite(v))
        .validate("body.response_format", v => _.isUndefined(v) || _.isString(v));
      
      // refresh_token切分，不再要求 authorization 头必须存在
      const tokens = await tokenSplitWithManager(request.headers.authorization);
      
      // 检查是否有可用的会话ID
      if (tokens.length === 0) {
        throw new APIException(EX.API_REQUEST_FAILED, '没有可用的会话ID，请通过环境变量设置SESSION_ID或者在管理页面添加并激活会话ID');
      }
      
      // 随机挑选一个refresh_token
      const token = _.sample(tokens);
      const {
        model,
        prompt,
        negative_prompt: negativePrompt,
        width,
        height,
        sample_strength: sampleStrength,
        response_format,
      } = request.body;
      const responseFormat = _.defaultTo(response_format, "url");
      const imageUrls = await generateImages(model, prompt, {
        width,
        height,
        sampleStrength,
        negativePrompt,
      }, token);
      let data = [];
      if (responseFormat == "b64_json") {
        data = (
          await Promise.all(imageUrls.map((url) => util.fetchFileBASE64(url)))
        ).map((b64) => ({ b64_json: b64 }));
      } else {
        data = imageUrls.map((url) => ({
          url,
        }));
      }
      return {
        created: util.unixTimestamp(),
        data,
      };
    },
  },
};
