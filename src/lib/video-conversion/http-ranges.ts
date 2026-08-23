export type UploadContentRangeType = {
  start: number;
  end: number;
  total: number;
  length: number;
};

export type DownloadRangeType = {
  start: number;
  end: number;
  length: number;
};

const isSafeNonNegativeInteger = (value: number) =>
  Number.isSafeInteger(value) && value >= 0;

export const parseUploadContentRange = (
  header: string | null
): UploadContentRangeType | null => {
  if (!header) return null;

  const match = /^bytes (\d+)-(\d+)\/(\d+)$/.exec(header);
  if (!match) return null;

  const start = Number(match[1]);
  const end = Number(match[2]);
  const total = Number(match[3]);

  if (
    !isSafeNonNegativeInteger(start) ||
    !isSafeNonNegativeInteger(end) ||
    !Number.isSafeInteger(total) ||
    total <= 0 ||
    end < start ||
    end >= total
  ) {
    return null;
  }

  return {
    start,
    end,
    total,
    length: end - start + 1,
  };
};

export const parseDownloadRange = (
  header: string | null,
  fileSize: number
): DownloadRangeType | null => {
  if (
    !header ||
    !Number.isSafeInteger(fileSize) ||
    fileSize <= 0 ||
    header.includes(",")
  ) {
    return null;
  }

  const match = /^bytes=(\d*)-(\d*)$/.exec(header);
  if (!match || (!match[1] && !match[2])) return null;

  if (!match[1]) {
    const suffixLength = Number(match[2]);
    if (!Number.isSafeInteger(suffixLength) || suffixLength <= 0) return null;

    const length = Math.min(suffixLength, fileSize);
    return {
      start: fileSize - length,
      end: fileSize - 1,
      length,
    };
  }

  const start = Number(match[1]);
  if (!isSafeNonNegativeInteger(start) || start >= fileSize) return null;

  const requestedEnd = match[2] ? Number(match[2]) : fileSize - 1;
  if (!isSafeNonNegativeInteger(requestedEnd) || requestedEnd < start) {
    return null;
  }

  const end = Math.min(requestedEnd, fileSize - 1);
  return {
    start,
    end,
    length: end - start + 1,
  };
};
