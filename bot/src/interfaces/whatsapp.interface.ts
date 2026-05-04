export interface whatsappQuery {
  id?: string;
  type:
    | 'text'
    | 'button_reply'
    | 'list_reply'
    | 'location'
    | 'application/pdf'
    | 'video/mp4'
    | 'video';
  file?: string;
  text: string;
  location?: {
    latitude: number;
    longitude: number;
  };
}

export interface WhatsappBodyPayload {
  object: string;
  entry: Entry[];
}

interface Entry {
  id: string;
  changes: Change[];
}

interface Change {
  value: Value;
  field: string;
}

interface Value {
  messaging_product: string;
  metadata: Metadata;
  contacts: Contact[];
  messages: Message[];
}

interface Metadata {
  display_phone_number: string;
  phone_number_id: string;
}

interface Contact {
  profile: Profile;
  wa_id: string;
}

interface Profile {
  name: string;
}

interface Message {
  from: string;
  id: string;
  timestamp: string;
  text: TextContent;
  type: string;
}

interface TextContent {
  body: string;
}
