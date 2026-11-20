/*
  The three things the built site knows about its live content, all public by
  design (see HANDOVER.md, "Live content"):

  - the API key, which only reads, and only from the site's own address and
    localhost (restricted in the ACC account's Google Cloud console)
  - the OAuth client ID the studio signs in with
  - the Sheet that holds everything editable

  The Drive folders are here as defaults only: the Sheet's Settings tab can
  point the site at different ones without a new build.
*/
export const LIVE = {
  apiKey: 'AIzaSyClduRWsYEigOpDvBZ6H1eIUjQvsQlxwjU',
  clientId: '278707494367-6q8fdvtc7el39lgu5em53eocj7iite4d.apps.googleusercontent.com',
  sheetId: '1DxiW2H-3zGUCGaIUZvEtZf_r7OoGUOenM2aYD_qF9jw',
  rootFolder: '1XyKP_CwiUxuEBxp8kxxxmeTdvL4Vq2WK',
  eventsFolder: '17oDIkyIWeZWRLVfBFBXTL2L6C0rjaWoB',
  teamFolder: '1SlCftPdm4CcYOjZJtHlU0E8u08ieRKgi',
};

export const sheetUrl = `https://docs.google.com/spreadsheets/d/${LIVE.sheetId}/edit`;
export const folderUrl = (id: string) => `https://drive.google.com/drive/folders/${id}`;
