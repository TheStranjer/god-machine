export const stripHtmlRegex = (htmlString) => {
  if (typeof htmlString !== 'string' || htmlString === null || htmlString === '') {
    return ''; // Handle null, empty, or non-string inputs
  }
  return htmlString.replace(/(<([^>]+)>)/ig, '');
};
