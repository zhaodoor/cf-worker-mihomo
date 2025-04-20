import yaml from 'js-yaml';
export default {
	async fetch(request, env) {
		const config = env.CONFIG || "https://raw.githubusercontent.com/Kwisma/cf-worker-mihomo/main/Config/Mihomo.yaml"
		const url = new URL(request.url);
		const hostHeader = request.headers.get("host");

		// 处理 URL 参数
		let urls = url.searchParams.getAll("url");

		if (urls.length === 1 && urls[0].includes(",")) {
			urls = urls[0].split(",").map(u => u.trim()); // 拆分并去除空格
		}

		if (urls.length === 0 || urls[0] === "") {
			const message = "没有提供 URL 参数，请检查并重新尝试！";
			return new Response(await getFakePage(message, hostHeader), {
				headers: {
					"Content-Type": "text/html; charset=utf-8"
				}
			}, { status: 400 });
		}

		// URL 校验
		for (let u of urls) {
			if (!isValidURL(u)) {
				const message = `无效的 URL: ${u}，请检查输入！`;
				return new Response(await getFakePage(message, hostHeader), {
					headers: {
						"Content-Type": "text/html; charset=utf-8"
					}
				}, { status: 400 });
			}
		}

		return new Response(await initconfig(urls, config), {
			headers: { "Content-Type": "text/plain; charset=utf-8" }
		});
	}
};

// 获取伪装页面
async function getFakePage(message, hostHeader) {
	return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>多订阅汇聚工具</title>
  <style>
    :root {
      --primary-color: #0078d7;
      --background-color: #f4f6f8;
      --card-background: #ffffff;
      --text-color: #333;
      --code-bg: #f1f1f1;
    }

    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background-color: var(--background-color);
      color: var(--text-color);
    }

    .container {
      max-width: 720px;
      margin: 3rem auto;
      padding: 2rem;
      background-color: var(--card-background);
      border-radius: 12px;
      box-shadow: 0 0 16px rgba(0, 0, 0, 0.05);
    }

    h1 {
      font-size: 1.8rem;
      color: var(--primary-color);
      margin-bottom: 1rem;
    }

    p {
      line-height: 1.6;
      margin-bottom: 1rem;
    }

    code {
      background-color: var(--code-bg);
      padding: 4px 6px;
      border-radius: 4px;
      font-family: monospace;
      font-size: 0.95em;
    }

    a {
      color: var(--primary-color);
      text-decoration: none;
    }

    a:hover {
      text-decoration: underline;
    }

    .notice {
      background-color: #eaf4ff;
      border-left: 4px solid var(--primary-color);
      padding: 0.75rem 1rem;
      margin-bottom: 1.5rem;
      border-radius: 6px;
    }
  </style>
</head>
<body>
  <main class="container">
    <header>
      <h1>欢迎使用多订阅汇聚工具</h1>
    </header>

    <section>
      <p>这是一个帮助你快速整合多个代理订阅链接，并生成统一汇聚地址的小工具。</p>
    </section>

    <section class="notice">
      <p><strong>提示：</strong>${message}</p>
    </section>

    <section>
      <p>请检查你提供的 <code>URL</code> 是否正确，或尝试更换订阅链接。</p>
      <p>正确格式如下：</p>
      <p><code>https://${hostHeader}/?url=订阅链接1,订阅链接2,订阅链接3</code></p>
    </section>

    <section>
      <p>开源地址：<a href="https://github.com/Kwisma/cf-worker-mihomo" target="_blank" rel="noopener noreferrer">GitHub 仓库</a></p>
    </section>
  </main>
</body>
</html>
    `;
}

// 校验 URL 是否有效
function isValidURL(url) {
	try {
		const parsedUrl = new URL(url);
		return ['http:', 'https:'].includes(parsedUrl.protocol);
	} catch (e) {
		return false;
	}
}

// 初始化配置
async function initconfig(urls, config) {
	let index = 0, proxy = [];
	for (const url of urls) {
		proxy.push(`
  provider${index + 1}:
    <<: *p
    url: "${url}"
    path: ./proxies/provider${index + 1}.yaml
    override:
      <<: *override
      additional-suffix: ' ${index + 1}'
`)
    index++;
    }
	const ProxyProviders = `
proxy-providers:
${proxy.join('')}
`

	const response = await fetch(config);
	let mihomodata = await response.text()
	// 使用正则表达式替换 proxy-providers 和 u 锚点
	mihomodata = mihomodata.replace(/proxy-providers:([\s\S]*?)(?=\n\S|$)/, ProxyProviders.trim());
	return yaml.dump(yaml.load(mihomodata), { noRefs: true, lineWidth: -1 });
}
