<!-- 上传组件 支持分片上传-->
<template>
  <div v-loading='uploading'
    :element-loading-text='loadingText'
    element-loading-spinner="el-icon-loading">
    <el-upload
    multiple
    class="upload-block"
    drag 
    :action="action"
    :http-request="handleUploadRequest"
    :auto-upload='true'
    :show-file-list='true'
    >
    <div class="el-upload__text">
      上传文件
    </div>
  </el-upload>
  </div>
</template>

<script>
import {sliceUpload} from '../lib/utils/sliceUpload';
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