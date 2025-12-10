import { describe, it, expect } from 'vitest';
import { parseCSVContent } from '../../utils/csv';

const fullHeader = 'source,subtopic1,subtopic2,swedish,swedishexample,en_word,en_example,es_word,es_example,fa_word,fa_example,el_word,el_example,uk_word,uk_example,ru_word,ru_example,hi_word,hi_example,bn_word,bn_example,sq_word,sq_example,tr_word,tr_example,ms_word,ms_example,fil_word,fil_example';

describe('parseCSVContent', () => {
  it('should parse valid CSV content correctly', () => {
    const csvText = `${fullHeader}
test_source,test_subtopic1,test_subtopic2,test_swedish,test_swedishexample,test_en_word,test_en_example,,,,,,,,,,,,,,,,,,,,,`;
    const existingWordKeys = new Set<string>();
    const { newWords, duplicateCount, invalidCount, addedCount } = parseCSVContent(csvText, existingWordKeys);

    expect(newWords).toHaveLength(1);
    expect(newWords[0].source).toBe('test_source');
    expect(newWords[0].subtopic1).toBe('test_subtopic1');
    expect(newWords[0].subtopic2).toBe('test_subtopic2');
    expect(newWords[0].swedish).toBe('test_swedish');
    expect(newWords[0].swedishExample).toBe('test_swedishexample');
    expect(newWords[0].translations.en?.word).toBe('test_en_word');
    expect(newWords[0].translations.en?.example).toBe('test_en_example');
    expect(duplicateCount).toBe(0);
    expect(invalidCount).toBe(0);
    expect(addedCount).toBe(1);
  });

  it('should return an error for invalid headers', () => {
    const csvText = `invalid_header,subtopic1,subtopic2,swedish,swedishexample,en_word,en_example
test_source,test_subtopic1,test_subtopic2,test_swedish,test_swedishexample,test_en_word,test_en_example`;
    const existingWordKeys = new Set<string>();
    const { newWords, duplicateCount, invalidCount, addedCount } = parseCSVContent(csvText, existingWordKeys);

    expect(newWords).toHaveLength(0);
    expect(duplicateCount).toBe(0);
    expect(invalidCount).toBe(1);
    expect(addedCount).toBe(0);
  });

  it('should skip duplicate entries', () => {
    const csvText = `${fullHeader}
test_source,test_subtopic1,test_subtopic2,test_swedish,test_swedishexample,test_en_word,test_en_example,,,,,,,,,,,,,,,,,,,,,`;
    const existingWordKeys = new Set<string>(['test_source|test_subtopic1|test_subtopic2|test_swedish']);
    const { newWords, duplicateCount, invalidCount, addedCount } = parseCSVContent(csvText, existingWordKeys);

    expect(newWords).toHaveLength(0);
    expect(duplicateCount).toBe(1);
    expect(invalidCount).toBe(0);
    expect(addedCount).toBe(0);
  });

  it('should handle empty or malformed rows', () => {
    const csvText = `${fullHeader}

,,,,,
test_source,test_subtopic1,test_subtopic2,test_swedish,test_swedishexample,test_en_word,test_en_example,,,,,,,,,,,,,,,,,,,,,`;
    const existingWordKeys = new Set<string>();
    const { newWords, duplicateCount, invalidCount, addedCount } = parseCSVContent(csvText, existingWordKeys);

    expect(newWords).toHaveLength(1);
    expect(duplicateCount).toBe(0);
    expect(invalidCount).toBe(2);
    expect(addedCount).toBe(1);
  });
});
