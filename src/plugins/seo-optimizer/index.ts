import { HookService } from '@/services/hook.service';

/**
 * An example plugin that automatically appends a canonical signature or SEO block 
 * to the end of every post content before it is rendered on the frontend.
 */
HookService.addFilter('the_content', async (content: string, post: any) => {
  try {
    const { OptionService } = await import('@/services/option.service');
    const opts = await OptionService.getOptions(['active_plugins']);
    const activePlugins = opts['active_plugins'] ? JSON.parse(opts['active_plugins']) : ['hello-dolly', 'seo-optimizer'];
    if (!activePlugins.includes('seo-optimizer')) {
      return content;
    }
  } catch (e) {}

  // Only append if it's a valid post content and it's a public post type
  if (typeof content === 'string' && post && post.postType === 'post') {
    const seoSignature = `
      <div class="seo-optimizer-plugin" style="margin-top: 40px; padding: 15px; border-top: 1px solid #eaeaea; font-size: 14px; color: #666;">
        <p><em>This article was optimized by the NodePress SEO Plugin.</em></p>
      </div>
    `;

    // Se for JSON (Editor.js)
    if (content.trim().startsWith('{')) {
      try {
        const data = JSON.parse(content);
        if (data.blocks) {
          data.blocks.push({
            type: 'paragraph',
            data: {
              text: '<em>This article was optimized by the NodePress SEO Plugin.</em>'
            }
          });
          return JSON.stringify(data);
        }
      } catch (e) {
        // Fallback to appending HTML
      }
    }

    // Se for HTML Legado
    return content + seoSignature;
  }
  
  return content;
}, 10);
