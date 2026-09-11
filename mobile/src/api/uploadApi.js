import { api }
  from "./client";

export const uploadFile =
  async (
    file,
    callback
  ) => {
    const formData =
      new FormData();

    formData.append(
      "file",
      {
        uri: file.uri,
        name: file.name,
        type: file.mimeType,
      }
    );

    const response =
      await api.post(
        "/upload",
        formData,
        {
          headers: {
            "Content-Type":
              "multipart/form-data",
          },
        }
      );

    callback(
      response.data.url
    );
  };