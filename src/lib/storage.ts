'use client';

import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from './firebase';

/**
 * Faz o upload de um arquivo para o Firebase Storage e retorna um objeto com a URL de download e o caminho do arquivo.
 * @param file O arquivo a ser enviado.
 * @param path O caminho no Storage onde o arquivo será salvo.
 * @returns Uma promessa que resolve com a URL de download e o caminho do arquivo.
 */
export function uploadFile(file: File, path: string): Promise<{ downloadURL: string, filePath: string }> {
  return new Promise((resolve, reject) => {
    const storageRef = ref(storage, path);
    const metadata = { contentType: file.type };
    const uploadTask = uploadBytesResumable(storageRef, file, metadata);

    uploadTask.on(
      'state_changed',
      (snapshot) => {
        // Opcional: observar o progresso do upload
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        // console.log('Upload is ' + progress + '% done');
      },
      (error) => {
        // Lidar com falhas de upload
        console.error("Firebase upload failed:", error);
        switch (error.code) {
          case 'storage/unauthorized':
            reject(new Error('Permissão negada. Verifique as regras de segurança do Firebase Storage.'));
            break;
          case 'storage/canceled':
            reject(new Error('O upload foi cancelado.'));
            break;
           case 'storage/unknown':
            reject(new Error('Ocorreu um erro desconhecido. Verifique a configuração de CORS do seu bucket no Google Cloud.'));
            break;
          default:
            reject(new Error(`Ocorreu um erro inesperado durante o upload: ${error.message} (código: ${error.code})`));
            break;
        }
      },
      () => {
        // Upload bem-sucedido
        getDownloadURL(uploadTask.snapshot.ref)
          .then((downloadURL) => {
            console.log('File available at', downloadURL);
            resolve({ downloadURL, filePath: path });
          })
          .catch((error) => {
             console.error("Error getting download URL:", error);
             reject(new Error('Ocorreu um erro ao obter a URL de download.'));
          });
      }
    );
  });
}


/**
 * Deleta um arquivo do Firebase Storage com base em seu caminho.
 * @param filePath O caminho completo do arquivo a ser deletado no Storage.
 */
export async function deleteFile(filePath: string) {
    if (!filePath) {
      console.log("Nenhum caminho de arquivo fornecido para exclusão.");
      return;
    }
    try {
        console.log(`Tentando excluir o arquivo em: ${filePath}`);
        const fileRef = ref(storage, filePath);
        await deleteObject(fileRef);
        console.log(`Arquivo ${filePath} excluído com sucesso.`);
    } catch (error: any) {
        if (error.code === 'storage/object-not-found') {
            console.warn("Arquivo não encontrado no Storage, pode já ter sido deletado:", filePath);
        } else {
            console.error(`Erro ao deletar arquivo antigo (${filePath}):`, error);
            // Não lançar erro para não bloquear o fluxo principal se a deleção falhar
        }
    }
}
