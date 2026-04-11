import axios from 'axios';
import * as cheerio from 'cheerio';

const MAX_CONTENT_LENGTH = 10 * 1024 * 1024; // 10MB
const REQUEST_TIMEOUT = 10000; // 10 seconds
const MAX_REDIRECTS = 5;

export const documentLoader = async (url: string): Promise<string> => {
  try {
    const { data } = await axios.get(url, {
      timeout: REQUEST_TIMEOUT,
      maxRedirects: MAX_REDIRECTS,
      maxContentLength: MAX_CONTENT_LENGTH,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    const $ = cheerio.load(data);
    $('script, style, nav, footer, header').remove();
    return $('body').text().replace(/\s+/g, ' ').trim();
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.code === 'ECONNABORTED') {
        throw new Error(`Request timeout after ${REQUEST_TIMEOUT}ms: ${error.message}`);
      }
      if (error.response?.status === 404) {
        throw new Error(`URL not found (404): ${url}`);
      }
      if (error.response?.status) {
        throw new Error(`HTTP ${error.response.status}: ${url}`);
      }
    }
    throw error;
  }
};
