package org.codefreak.codefreak.service

import com.nhaarman.mockitokotlin2.any
import java.io.InputStream
import java.util.Optional
import java.util.UUID
import org.codefreak.codefreak.entity.FileCollection
import org.codefreak.codefreak.repository.FileCollectionRepository
import org.codefreak.codefreak.service.file.JpaFileService
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.mockito.InjectMocks
import org.mockito.Mock
import org.mockito.Mockito.`when`
import org.mockito.MockitoAnnotations

class JpaFileServiceTest {
  private val collectionId = UUID(0, 0)
  private val filePath = "file.txt"
  private val directoryPath = "some/path"

  @Mock
  lateinit var fileCollectionRepository: FileCollectionRepository
  @InjectMocks
  val fileService = JpaFileService()

  @Before
  fun init() {
    MockitoAnnotations.initMocks(this)

    val fileCollection = FileCollection(collectionId)
    `when`(fileCollectionRepository.findById(any())).thenReturn(Optional.of(fileCollection))
  }

  @Test
  fun `createFile creates an empty file`() {
    createFile(filePath)
    assertTrue(containsFile(filePath))
  }

  @Test(expected = IllegalArgumentException::class)
  fun `createFile throws when the path already exists`() {
    createFile(filePath)
    createFile(filePath) // Throws because file already exists
  }

  @Test(expected = IllegalArgumentException::class)
  fun `createFile throws on empty path name`() {
    createFile("")
  }

  @Test
  fun `createFile keeps other files intact`() {
    createFile("other.txt")
    createDirectory("aDirectory")
    createFile(filePath)

    assertTrue(containsFile(filePath))
    assertTrue(containsFile("other.txt"))
    assertTrue(containsDirectory("aDirectory"))
  }

  @Test
  fun `createDirectory creates an empty directory`() {
    createDirectory(directoryPath)
    assertTrue(containsDirectory(directoryPath))
  }

  @Test(expected = IllegalArgumentException::class)
  fun `createDirectory throws when the path already exists`() {
    createDirectory(directoryPath)
    createDirectory(directoryPath) // Throws because directory already exists
  }

  @Test(expected = IllegalArgumentException::class)
  fun `createDirectory throws on empty path name`() {
    createFile("")
  }

  @Test
  fun `createDirectory keeps other files intact`() {
    createFile("other.txt")
    createDirectory("aDirectory")
    createDirectory(directoryPath)

    assertTrue(containsFile("other.txt"))
    assertTrue(containsDirectory("aDirectory"))
    assertTrue(containsDirectory(directoryPath))
  }

  @Test
  fun `deleteFile deletes existing file`() {
    createFile(filePath)

    deleteFile(filePath)

    assertFalse(containsFile(filePath))
  }

  @Test(expected = IllegalArgumentException::class)
  fun `deleteFile throws when path does not exist`() {
    deleteFile(filePath)
  }

  @Test
  fun `deleteFile keeps other files and directories intact when deleting a file`() {
    createFile(filePath)
    createFile("DO_NOT_DELETE.txt")
    createDirectory(directoryPath)

    deleteFile(filePath)

    assertFalse(containsFile(filePath))
    assertTrue(containsFile("DO_NOT_DELETE.txt"))
    assertTrue(containsDirectory(directoryPath))
  }

  @Test
  fun `deleteFile deletes existing directory`() {
    createDirectory(directoryPath)

    deleteFile(directoryPath)

    assertFalse(containsDirectory(directoryPath))
  }

  @Test
  fun `deleteFile keeps other files and directories intact when deleting a directory`() {
    createFile(filePath)
    createDirectory("DO_NOT_DELETE")
    createDirectory(directoryPath)

    deleteFile(directoryPath)

    assertTrue(containsFile(filePath))
    assertTrue(containsDirectory("DO_NOT_DELETE"))
    assertFalse(containsDirectory(directoryPath))
  }

  @Test
  fun `deleteFile deletes directory content recursively`() {
    val directoryToDelete = directoryPath
    val fileToRecursivelyDelete = "$directoryPath/$filePath"
    val directoryToRecursivelyDelete = "$directoryPath/$directoryPath"
    val fileToBeUnaffected = filePath

    createDirectory(directoryToDelete)
    createFile(fileToRecursivelyDelete)
    createDirectory(directoryToRecursivelyDelete)
    createFile(fileToBeUnaffected)

    deleteFile(directoryToDelete)

    assertFalse(containsDirectory(directoryToDelete))
    assertFalse(containsFile(fileToRecursivelyDelete))
    assertFalse(containsDirectory(directoryToRecursivelyDelete))
    assertTrue(containsFile(fileToBeUnaffected))
  }

  @Test
  fun `filePutContents puts the file contents correctly`() {
    val contents = byteArrayOf(42)
    createFile(filePath)

    filePutContents(filePath).use {
      it.write(contents)
    }

    assertTrue(containsFile(filePath))
    assertTrue(equals(getFileContents(filePath).readBytes(), contents))
  }

  private fun equals(a: ByteArray, b: ByteArray): Boolean {
    if (a.size != b.size) {
      return false
    }

    a.forEachIndexed { index, byte ->
      if (byte != b[index]) {
        return false
      }
    }

    return true
  }

  @Test(expected = IllegalArgumentException::class)
  fun `filePutContents throws for directories`() {
    createDirectory(directoryPath)

    filePutContents(directoryPath).use {
      it.write(byteArrayOf(42))
    }
  }

  @Test(expected = IllegalArgumentException::class)
  fun `filePutContents throws if path does not exist`() {
    filePutContents(filePath).use {
      it.write(byteArrayOf(42))
    }
  }

  @Test
  fun `moveFile moves existing file`() {
    createFile(filePath)

    moveFile(filePath, "new.txt")

    assertFalse(containsFile(filePath))
    assertTrue(containsFile("new.txt"))
  }

  @Test(expected = IllegalArgumentException::class)
  fun `moveFile throws when source path does not exist`() {
    moveFile(filePath, "new.txt")
  }

  @Test(expected = IllegalArgumentException::class)
  fun `moveFile throws when target file path already exists`() {
    createFile(filePath)
    createFile("new.txt")

    moveFile(filePath, "new.txt")
  }

  @Test
  fun `moveFile does not change file contents`() {
    val contents = byteArrayOf(42)
    createFile(filePath)
    filePutContents(filePath).use {
      it.write(contents)
    }

    moveFile(filePath, "new.txt")

    assertTrue(equals(contents, getFileContents("new.txt").readBytes()))
  }

  @Test
  fun `moveFile moves existing directory`() {
    createDirectory(directoryPath)

    moveFile(directoryPath, "new")

    assertFalse(containsDirectory(directoryPath))
    assertTrue(containsDirectory("new"))
  }

  @Test(expected = IllegalArgumentException::class)
  fun `moveFile throws when target directory path already exists`() {
    createDirectory(directoryPath)
    createDirectory("new")

    moveFile(directoryPath, "new")
  }

  @Test
  fun `moveFile moves inner hierarchy correctly`() {
    val innerDirectory = "$directoryPath/inner"
    val innerFile1 = "$innerDirectory/$filePath"
    val innerFile1Contents = byteArrayOf(42)
    val innerFile2 = "$directoryPath/$filePath"
    val innerFile2Contents = byteArrayOf(17)

    createDirectory(directoryPath)
    createDirectory(innerDirectory)
    createFile(innerFile1)
    filePutContents(innerFile1).use {
      it.write(innerFile1Contents)
    }
    createFile(innerFile2)
    filePutContents(innerFile2).use {
      it.write(innerFile2Contents)
    }

    moveFile(directoryPath, "new")

    assertFalse(containsDirectory(directoryPath))
    assertFalse(containsDirectory(innerDirectory))
    assertFalse(containsFile(innerFile1))
    assertFalse(containsFile(innerFile2))
    assertTrue(containsDirectory("new"))
    assertTrue(containsDirectory("new/inner"))
    assertTrue(containsFile("new/inner/$filePath"))
    assertTrue(equals(getFileContents("new/inner/$filePath").readBytes(), innerFile1Contents))
    assertTrue(containsFile("new/$filePath"))
    assertTrue(equals(getFileContents("new/$filePath").readBytes(), innerFile2Contents))
  }

  private fun createFile(path: String) = fileService.createFile(collectionId, path)

  private fun createDirectory(path: String) = fileService.createDirectory(collectionId, path)

  private fun deleteFile(path: String) = fileService.deleteFile(collectionId, path)

  private fun containsFile(path: String): Boolean = fileService.containsFile(collectionId, path)

  private fun containsDirectory(path: String): Boolean = fileService.containsDirectory(collectionId, path)

  private fun filePutContents(path: String) = fileService.filePutContents(collectionId, path)

  private fun getFileContents(path: String): InputStream = fileService.getFileContents(collectionId, path)

  private fun moveFile(from: String, to: String) = fileService.moveFile(collectionId, from, to)
}
