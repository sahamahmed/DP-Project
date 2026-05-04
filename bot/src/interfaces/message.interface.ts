export interface MessageType {
  footerText?: string;
  buttonText?: string;
  type: 'text' | 'button' | 'list' | 'image' | 'document' | 'cta_url';

  // text
  text?: string;

  // button & list
  headerText?: string;
  bodyText?: string;
  buttons?: string[]; // for buttons
  sections?: {
    title: string;
    rows: { id: string; title: string; description?: string }[];
  }[]; // for lists

  // media & cta_url
  url?: string; // image/document/cta_url
  caption?: string; // image
  filename?: string; // document
}
