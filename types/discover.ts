export interface UpnpXml {
    name: keyof Speaker;
    attributes: any;
    content?: string;
    children: UpnpXml[];
  }
  
export type Device = { [key: string]: UpnpXml }


export interface Speakers {
  [id: string] : Speaker;
}

export interface Speaker {
  "qq:X_QPlay_SoftwareCapability": UpnpXml;
  deviceType:                      UpnpXml;
  friendlyName:                    UpnpXml;
  manufacturer:                    UpnpXml;
  manufacturerURL:                 UpnpXml;
  modelDescription:                UpnpXml;
  modelName:                       UpnpXml;
  modelNumber:                     UpnpXml;
  modelURL:                        UpnpXml;
  serialNumber:                    UpnpXml;
  UDN:                             UpnpXml;
  presentationURL:                 UpnpXml;
  serviceList:                     UpnpXml;
}

