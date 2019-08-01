<!-- 上传组件 支持分片上传-->
<template>
    <el-upload
    class="upload-demo"
    drag 
    :action="action"
    :http-request="handleUploadRequest"
    :on-preview="handlePreview"
    :on-remove="handleRemove"
    :file-list="fileList"
    :show-file-list='true'
    list-type="picture">
  <i class="el-icon-upload"></i>
  <div class="el-upload__text">将文件拖到此处，或<em>点击上传</em></div>
</el-upload>
</template>

<script>
import md5 from 'js-md5'
import axios from 'axios'
  export default {
    name: 'upload',
  computed: {
  },
    data() {
      return {
        action:"http://localhost:53822/api/video",
        uploadUrl:"http://localhost:53822/api/video/filemerge",
        autoUpload : false,
        fileList:[],
        listType:"picture",
        uploading: false,
      loadingText: '上传进度',
      };
    },
    watch:{
      fileList(fileList){
        this.$nextTick(()=>{
          this.dealUpload();
        })
      }
    },
    methods:{
      handleUploadRequest(back){
        this.fileList.push(back.file);
      },
      handleRemove(file, fileList) {
        console.log('移除');
        console.log(file, fileList);
      },
      handlePreview(file) {
        console.log('预览');
        console.log(file);
      },
      dealUpload(){
        sliceUpload({
          files:this.fileList,
          chunkSize:5,
          chunkUrl:this.action,
          fileUrl:this.action,
          progress:(num)=>{
            this.loadingText = '上传进度'+num+'%'
          },
          success: (data) => {
          this.uploading = false
          this.$emit('uploaded', data)
        },
        error: (e) => {
          this.uploading = false
        }
        })
      },
      sliceUpload ({files, chunkUrl, fileUrl, pieceSize = 5, progress, success, error})  {
  if (!files || !files.length) return
  // 上传过程中用到的变量
  let readingFile = false;
  let fileList = [] // 总文件列表
  let progressNum = 1 // 进度
  let successAllCount = 0 // 上传成功的片数
  // let currentAllChunk = 0 // 当前上传的片数索引
  let AllChunk = 0 // 所有文件的chunk数之和
  let AllFileSize = 0 // 所有文件size
  // 获取md5
  const readFileMD5 = (files) => {
    // 读取每个文件的md5
    files.map((file, index) => {
      let fileRederInstance = new FileReader()
      fileRederInstance.readAsBinaryString(file)
      fileRederInstance.addEventListener('load', e => {
        let fileBolb = e.target.result
        var start  = Date.now();
        console.log('开始计算文件' + file.name + '的md5,时间：' + start);
        let fileMD5 = md5(fileBolb)
        console.log('结束计算文件' + file.name + '的md5,时间：' + Date.now());
        console.log('结束计算文件' + file.name + '的md5,时间：' + (Date.now() - start));
        if (!fileList.some((arr) => arr.md5 === fileMD5)) {
          fileList.push({md5: fileMD5, name: file.name, file})
          AllFileSize = AllFileSize + file.size
        }
        if (index === files.length - 1)
        {
          readChunkMD5(fileList);
        } 
      }, false)
    })
  }
  const getChunkInfo = (file, currentChunk, chunkSize) => {
    let start = currentChunk * chunkSize
    let end = Math.min(file.size, start + chunkSize)
    let chunk = file.slice(start, end)
    return { start, end, chunk }
  }
  // 针对每个文件进行chunk处理
  const readChunkMD5 = (fileList) => {
    fileList.map((currentFile, fileIndex) => {
      const chunkSize = pieceSize * 1024 * 1024 // 5MB一片
      const chunkCount = Math.ceil(currentFile.file.size / chunkSize) // 总片数
      AllChunk = AllChunk + chunkCount // 计算全局chunk数
      // let fileSize = currentFile.file.size // 文件大小
      // 针对单个文件进行chunk上传
      for (var i = 0; i < chunkCount; i++) {
        const { chunk } = getChunkInfo(currentFile.file, i, chunkSize)
        let chunkFR = new FileReader()
        chunkFR.readAsBinaryString(chunk)
        chunkFR.addEventListener('load', e => {
          let chunkBolb = e.target.result
          let chunkMD5 = md5(chunkBolb)
          // this.readingFile = false
          uploadChunk(currentFile, {chunkMD5, chunk, currentChunk: i, chunkCount}, fileIndex)
        }, false)
      }
    })
  }
  // 更新进度
  const progressFun = () => {
    progressNum = Math.ceil(successAllCount / AllChunk * 100)
    progress(progressNum)
  }
  // 对分片已经处理完毕的文件进行上传
  const uploadFile = (currentFile) => {
    let makeFileForm = new FormData()
    makeFileForm.append('md5', currentFile.fileMD5)
    makeFileForm.append('file_name', currentFile.name)
    fetch({ // 合并文件
      type: 'post',
      url: fileUrl,
      data: makeFileForm
    }).then(res => {
      progressFun()
      res.file_name = currentFile.name
      success && success(res)
      successAllCount++
    }).catch(e => {
      error && error(e)
    })
  }
  const uploadChunk = (currentFile, chunkInfo, fileIndex) => {
    let fetchForm = new FormData()
    fetchForm.append('file_name', currentFile.name)
    fetchForm.append('md5', currentFile.fileMD5)
    fetchForm.append('data', chunkInfo.chunk)
    fetchForm.append('chunks', chunkInfo.chunkCount)
    fetchForm.append('chunk_index', chunkInfo.currentChunk)
    fetchForm.append('chunk_md5', chunkInfo.chunkMD5);

    axios.post(chunkUrl,fetchForm)
    .then(res => {
      progressFun()
      // currentAllChunk++
      if (chunkInfo.currentChunk < chunkInfo.chunkCount - 1) {
        successAllCount++
      } else {
        // 当总数大于等于分片个数的时候
        if (chunkInfo.currentChunk >= chunkInfo.chunkCount - 1) {
          uploadFile(currentFile, fileIndex)
        }
      }
    }).catch((e) => {
      error && error(e)
    })
  }
  readFileMD5(files) // 开始执行代码
}
    }
  }
 
</script>

<style lang="scss" scoped>
.upload-block {
  text-align: center;
  line-height: 80px;
  height: 80px;
  .el-upload {
    width: 100%;
    height: 100%;
    .el-upload-dragger {
      width: 100%;
      height: 100%;
      .el-upload__text {
        position: relative;
        font-size: 1.2em;
        color: #409EFF;
        i {
          font-size: 1.5em;
          margin-right: 10px;
        }
      }
    }
  }
}
</style>