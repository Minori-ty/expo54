import { animeTable } from '@/db/schema'
import * as DocumentPicker from 'expo-document-picker'
// 保留你的 legacy 导入（无需修改），仅移除 RNFS 导入
import * as FileSystem from 'expo-file-system/legacy'
import type { DeepExpand } from 'types-tools'

// 🔥 替换1：用 Expo FileSystem 官方应用内私有目录 替代 RNFS.DownloadDirectoryPath
// documentDirectory 是应用沙盒内的持久化私有目录，多平台兼容（iOS/Android），无需额外权限
export const DIR = FileSystem.documentDirectory || ''

type TAnime = DeepExpand<Omit<typeof animeTable.$inferSelect, 'createdAt' | 'updatedAt' | 'eventId'>>
type TJsonFileData = DeepExpand<{ animeList: TAnime[] }>

/**
 * 导出数据为json文件（原有逻辑完全保留，仅替换写入方法）
 * @param data
 * @param filename
 * @returns
 */
export async function exportJsonFile(data: TJsonFileData, filename: string) {
    if (!filename.endsWith('.json')) {
        filename += '.json'
    }

    const path = `${DIR}/${filename}`
    const content = JSON.stringify(data, null, 2)

    // 🔥 替换2：FileSystem.writeAsStringAsync 替代 RNFS.writeFile
    await FileSystem.writeAsStringAsync(path, content, {
        encoding: FileSystem.EncodingType.UTF8,
    })

    return true
}

/**
 * 导入json文件数据（原有逻辑无 RNFS 依赖，完全保留）
 * @returns
 */
export async function importJsonFile(): Promise<TJsonFileData> {
    const result = await DocumentPicker.getDocumentAsync({
        type: 'application/json',
        copyToCacheDirectory: true,
    })

    if (result.canceled || !result.assets || result.assets.length === 0) {
        throw Error('用户取消选择')
    }

    const file = result.assets[0]
    const content = await FileSystem.readAsStringAsync(file.uri, {
        encoding: FileSystem.EncodingType.UTF8,
    })

    const data = JSON.parse(content)
    return data
}

/**
 * 扫描应用私有目录中的json文件（🔥 核心改造：替换 RNFS.readDir 逻辑）
 * @returns { name: string; size: number }[] 保持原有返回值格式不变
 */
export async function scanJsonFile(): Promise<{ name: string; size: number }[]> {
    if (!DIR) throw Error('应用目录获取失败')

    // 🔥 替换3：FileSystem.readDirectoryAsync 替代 RNFS.readDir
    // 该方法返回目录下所有文件/目录名的数组
    const allFiles = await FileSystem.readDirectoryAsync(DIR)
    const jsonFiles: { name: string; size: number }[] = []

    for (const fileName of allFiles) {
        if (fileName.endsWith('.json')) {
            // 🔥 补充：通过 getInfoAsync 获取文件大小（RNFS.readDir 自动返回，Expo 需要主动获取）
            const fileInfo = await FileSystem.getInfoAsync(`${DIR}/${fileName}`)
            // 过滤掉目录（仅保留文件），并收集名称和大小
            if (fileInfo.exists && !fileInfo.isDirectory) {
                jsonFiles.push({
                    name: fileName,
                    size: fileInfo.size || 0, // size 为文件字节数，与 RNFS 保持一致
                })
            }
        }
    }

    return jsonFiles
}

/**
 * 删除json文件（原有逻辑保留，仅替换删除方法）
 * @param fileName
 * @returns
 */
export async function deleteJsonFile(fileName: string): Promise<boolean> {
    if (!fileName.endsWith('.json')) {
        fileName += '.json'
    }

    const path = `${DIR}/${fileName}`
    // 🔥 替换4：FileSystem.deleteAsync 替代 RNFS.unlink
    await FileSystem.deleteAsync(path, {
        idempotent: true, // 即使文件不存在也不报错（推荐保留，提升鲁棒性）
    })

    return true
}

/**
 * 批量删除json文件（原有逻辑完全无依赖，直接保留）
 * @param fileNameList
 * @returns
 */
export async function deleteJsonFileList(fileNameList: string[]) {
    return await Promise.all(fileNameList.map(deleteJsonFile))
}
