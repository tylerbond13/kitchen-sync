const test = require('node:test');
const assert = require('node:assert/strict');

const youtube = require('../server/youtube');

test('extractVideoResults reads video renderers from YouTube initial data', () => {
  const initialData = {
    contents: {
      twoColumnSearchResultsRenderer: {
        primaryContents: {
          sectionListRenderer: {
            contents: [{
              itemSectionRenderer: {
                contents: [
                  {
                    videoRenderer: {
                      videoId: 'dQw4w9WgXcQ',
                      title: { runs: [{ text: 'Never Gonna Give You Up' }] },
                      ownerText: { runs: [{ text: 'Rick Astley' }] },
                      lengthText: { simpleText: '3:33' },
                      thumbnail: { thumbnails: [{ url: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/default.jpg' }] },
                    },
                  },
                  {
                    videoRenderer: {
                      videoId: 'dQw4w9WgXcQ',
                      title: { runs: [{ text: 'Duplicate' }] },
                    },
                  },
                ],
              },
            }],
          },
        },
      },
    },
  };
  const html = `<script>var ytInitialData = ${JSON.stringify(initialData)};</script>`;
  const results = youtube.extractVideoResults(html);

  assert.deepEqual(results, [{
    videoId: 'dQw4w9WgXcQ',
    title: 'Never Gonna Give You Up',
    channel: 'Rick Astley',
    duration: '3:33',
    thumbnail: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/default.jpg',
  }]);
});
