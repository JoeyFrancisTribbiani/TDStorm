<template>
  <el-dialog :visible.sync="show" title="后台上传短视频信息" width="800px" @close="onDialogClose('theForm')" :close-on-click-modal="false" :append-to-body="true">
    <div v-loading="loading.form" class="form-wrapper" :element-loading-text="uploadProgressTip">
      <el-form size="small" :model="model" label-position="left" label-width="120px" ref="theForm" :rules="rules">
        <el-form-item label="马甲账号" prop="vestId">
          <el-select v-model="model.vestId" placeholder="选择马甲账号" filterable>
            <el-option v-for="(item, index) in vests" :key="index" :value="item.vestId" :label="item.nickname"></el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="视频简介" prop="textIntro">
          <el-input v-model.trim="model.textIntro" type="textarea"></el-input>
        </el-form-item>
        <el-form-item label="视频类型" prop="typeId">
          <el-select v-model="model.typeId" placeholder="视频类型">
            <template v-for="(item, index) in types">
              <el-option :label="item.videoTypeName" :value="item.videoTypeId" :key="index"></el-option>
            </template>
          </el-select>
        </el-form-item>
        <el-form-item label="视频话题" prop="selectedTopics">
          <el-select v-model="model.selectedTopics" placeholder="键入搜索视频话题, 可多选" multiple filterable remote :remote-method="remoteSearchVideoTopic" :loading="loading.select.topic">
            <template v-for="(item, index) in videoTopicList">
              <!-- 多选时, 设置value为object -->
              <el-option :label="item.tname" :value="{ topicId: item.topicId, value: item.tname }" :key="index"></el-option>
            </template>
          </el-select>
        </el-form-item>
        <el-form-item label="所属国家" prop="country">
          <el-select v-model="model.country" placeholder="国家" filterable>
            <el-option v-for="(item, index) in countries" :key="index" :value="item.coding" :label="item.countryName"></el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="视频文件" prop="url">
          <div id="pick" ref="videoPicker" :style="pickContainerStyle">选择视频文件</div>
          <p class="selected-video-name" v-if="model.url !== ''">{{ model.url }}</p>
        </el-form-item>
        <el-form-item label="视频封面" prop="img">
          <el-upload :action="uploadAction" :on-change="onImgFileChange" :file-list="imgFileList" :before-remove="onFileRemove" accept="image/*" ref="create-upload" :auto-upload="false">
            <el-button size="small" type="primary">点击选择新图片</el-button>
            <div slot="tip" class="el-upload__tip">只能上传图片类型文件(jpg/png等)</div>
          </el-upload>
        </el-form-item>
      </el-form>
    </div>
    <span slot="footer">
      <el-button @click="show = false" size="small">取 消</el-button>
      <el-button type="primary" @click="doCreate" size="small" :loading="btnLoading">确 定</el-button>
    </span>
  </el-dialog>
</template>

<script>
import { searchVideoTopicListByName } from '../lib/utils/http'
import { debounce } from 'lodash';
import WebUploader from 'webuploader'
 
export default {
  name: 'video-info-create-dialog',
  data() {
    const token = localStorage.getItem('token');
    return {
      pickContainerStyle: {
        width: '120px',
        height: '50px'
      },
      uploader: null,
      uploadProgressTip: '',
      videoTopicList: [],
      show: false,
      loading: {
        form: false,
        select: {
          topic: false
        }
      },
      model: {
        vestId: null,
        textIntro: null,
        typeId: null,
        selectedTopics: [],
        topicIds: [],
        topicNames: [],
        country: null,
        url: null,
        img: null,
        video: null,
        cover: null,
        chunkSize: 5242880,
        fileMd5: null,
        timestamp: Date.now()
      },
      rules: {
        vestId: [
          { required: true, trigger: 'change', message: '必须选择一个马甲账号' }
        ],
        textIntro: [
          { required: true, trigger: 'change', message: '视频简介不能为空' }
        ],
        country: [
          {
            required: true,
            trigger: ['change', 'blur'],
            message: '所属国家不能为空'
          }
        ],
        typeId: [
          {
            required: true,
            trigger: ['change', 'blur'],
            message: '视频类型不能为空'
          }
        ],
        url: [
          {
            required: true,
            trigger: ['change', 'blur'],
            message: '视频文件不能为空'
          }
        ]
      },
      imgFileList: [],
      videoFileList: [],
      vests: [],
      formLoading: true,
      btnLoading: false,
      // 文件上传的url
      uploadAction: `/faceshow-admin/api/fileupload?token=${token}&temp=${Date.now()}`
    };
  },
  props: {
    types: {
      type: Array,
      required: true
    },
 
    countries: {
      type: Array,
      required: true
    },
    accept: {
      type: String,
      default: 'video'
    },
    // 上传地址
    url: {
      type: String,
      default: 'faceshow-admin/video/info/save'
    },
    // 上传最大数量 默认为100
    fileNumLimit: {
      type: Number,
      default: 100
    },
    // 大小限制 默认2M
    fileSingleSizeLimit: {
      type: Number,
      default: 153600000
    },
    // 生成formData中文件的key，下面只是个例子，具体哪种形式和后端商议
    keyGenerator: {
      type: Function,
      default(file) {
        const currentTime = new Date().getTime();
        const key = `${currentTime}.${file.name}`;
        return key;
      }
    },
    multiple: {
      type: Boolean,
      default: false
    },
    // 上传按钮ID
    uploadButton: {
      type: String,
      default: ''
    }
  },
  mounted() {
    this.initWebUpload();
  },
  methods: {
    initWebUpload() {
      setTimeout(() => {
        /* eslint-disable no-undef */
        this.uploader = WebUploader.create({
          auto: false, // 选完文件后，是否自动上传
          swf: '/static/lib/webuploader/Uploader.swf', // swf文件路径
          server: this.url + '?token=' + this.$store.state.user.token, // 文件接收服务端
          pick: {
            id: this.$refs.videoPicker
          },
          accept: this.getAccept(this.accept), // 允许选择文件格式。
          threads: 5,
          fileNumLimit: this.fileNumLimit, // 限制上传个数
          fileSingleSizeLimit: this.fileSingleSizeLimit, // 限制单个上传图片的大小
          formData: this.model, // 上传所需参数
          chunked: true, // 分片上传
          chunkSize: 5242880, // 分片大小
          chunkRetry: false,
          duplicate: false, // 重复上传
          fileVal: 'video'
        });
        // 当有文件被添加进队列的时候，添加到页面预览
        this.uploader.on('fileQueued', file => {
          // 只是为了校验表单有效性
          this.model.url = file.name;
          this.$refs.theForm.validateField('url');
        });
        this.uploader.on('uploadStart', file => {
          // 在这里可以准备好formData的数据
          // this.uploader.options.formData.key = this.keyGenerator(file);
        });
        // 文件上传过程中创建进度条实时显示。
        this.uploader.on('uploadProgress', (file, percentage) => {
          this.uploadProgressTip = `正在上传: ${Math.floor(
            percentage * 100
          )} %`;
        });
        this.uploader.on('uploadSuccess', (file, response) => {
          const serverResp = response._raw ? JSON.parse(response._raw) : null;
          if (serverResp && serverResp.code !== 0) {
            this.$message.error(
              `视频上传失败: ${serverResp.msg}, 请重新点击上传按钮`
            );
            this.btnLoading = false;
            this.loading.form = false;
          } else {
            this.$message.info('视频已提交到后台处理');
            this.show = false;
            this.$emit('done');
          }
        });
        this.uploader.on('uploadError', (file, reason) => {
          this.$message.error('上传失败！！！');
          this.btnLoading = false;
          this.loading.form = false;
        });
        this.uploader.on('error', type => {
          let errorMessage = '';
          if (type === 'F_EXCEED_SIZE') {
            errorMessage = `文件大小不能超过${this.fileSingleSizeLimit /
              (1024 * 1000)}M`;
          } else if (type === 'Q_EXCEED_NUM_LIMIT') {
            errorMessage = '文件上传已达到最大上限数';
          } else {
            errorMessage = `上传出错！请检查后重新上传！错误代码${type}`;
          }
          console.error(errorMessage);
          this.$emit('error', errorMessage);
        });
        this.uploader.on('uploadComplete', file => {
          console.log(`uploadComplete ${file ? 'file 为空' : file.name}`);
          this.$emit('complete', file);
        });
 
        console.log(this.uploader);
        let containerStyle = {
          width: '120px',
          height: '50px'
        };
 
        this.pickContainerStyle = containerStyle;
      }, 500);
    },
    upload(file) {
      this.uploader.upload(file);
    },
    stop(file) {
      this.uploader.stop(file);
    },
    // 取消并中断文件上传
    cancelFile(file) {
      this.uploader.cancelFile(file);
    },
    // 在队列中移除文件
    removeFile(file, bool) {
      this.uploader.removeFile(file, bool);
    },
    getAccept(accept) {
      switch (accept) {
        case 'text':
          return {
            title: 'Texts',
            exteensions: 'doc,docx,xls,xlsx,ppt,pptx,pdf,txt',
            mimeTypes: '.doc,docx,.xls,.xlsx,.ppt,.pptx,.pdf,.txt'
          };
        case 'video':
          return {
            title: 'Videos',
            exteensions: 'mp4',
            mimeTypes: '.mp4'
          };
        case 'image':
          return {
            title: 'Images',
            exteensions: 'gif,jpg,jpeg,bmp,png',
            mimeTypes: '.gif,.jpg,.jpeg,.bmp,.png'
          };
        default:
          return accept;
      }
    },
    onImgFileChange(file, fileList) {
      if (file) {
        this.model.cover = file.raw;
        // 只是为了表单验证通过
        this.model.img = file.name;
        this.imgFileList = [].concat({ name: file.name });
      } else {
        this.model.cover = null;
        this.model.img = null;
        this.imgFileList = [];
      }
    },
    remoteSearchVideoTopic: debounce(function(query) {
      // 搜索视频话题
      if (query === null || query.trim() === '') {
        return;
      }
 
      this.loading.select.topic = true;
      searchVideoTopicListByName(query.trim())
        .then(({ data }) => {
          this.videoTopicList = data.list;
          this.loading.select.topic = false;
        })
        .catch(error => {});
    }, 500),
    doCreate() {
      // 验证表单有效性
      this.$refs.theForm.validate(valid => {
        if (valid) {
          this.btnLoading = true;
          this.loading.form = true;
 
          this.model.topicIds = this.model.selectedTopics.map(
            item => item.topicId
          );
          this.model.topicNames = this.model.selectedTopics.map(
            item => item.value
          );
 
          // 由于初始化uploader的时候， model中的属性还没有赋值， 在上传之前需要再赋值一次
          this.model.timestamp = Date.now();
          console.log(this.model.timestamp);
          this.uploader.options.formData = this.model;
          this.uploadProgressTip = '正在计算文件MD5';
          this.uploader.md5File(this.uploader.getFiles()[0]).then(val => {
            this.model.fileMd5 = val;
            this.uploader.upload();
          });
        } else {
          return false;
        }
      });
    },
    showDialog(vests) {
      this.show = true;
      this.vests = vests;
      this.initWebUpload();
    },
    onFileRemove(file, fileList) {
      // 由于图片为必选项, 所以这里禁止移除已经上传的图片文件
      this.$message({
        type: 'warning',
        message: '图片文件不可为空!'
      });
      return false;
    },
    onDialogClose(formRef) {
      this.loading.form = false;
      this.btnLoading = false;
      this.videoFileList = [];
      this.$refs[formRef].resetFields();
      this.$refs['create-upload'].clearFiles();
      this.imgFileList = [];
      this.uploader.destroy();
    }
  }
};
</script>


<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="scss">
html,
body,
p,
span,
applet,
object,
iframe,
h1,
h2,
h3,
h4,
h5,
h6,
p,
blockquote,
pre,
a,
abbr,
acronym,
address,
big,
cite,
code,
del,
dfn,
em,
img,
ins,
kbd,
q,
s,
samp,
small,
strike,
strong,
sub,
sup,
tt,
var,
b,
u,
i,
center,
dl,
dt,
dd,
ol,
ul,
li,
fieldset,
form,
label,
legend,
table,
caption,
tbody,
tfoot,
thead,
tr,
th,
td,
article,
aside,
canvas,
details,
figcaption,
figure,
footer,
header,
hgroup,
menu,
nav,
section,
summary,
time,
mark,
audio,
video,
input {
  margin: 0;
  padding: 0;
  border: none;
  outline: 0;
  font-size: 100%;
  font: inherit;
  vertical-align: baseline;
}
 
html,
body,
form,
fieldset,
p,
p,
h1,
h2,
h3,
h4,
h5,
h6 {
  -webkit-text-size-adjust: none;
}
 
article,
aside,
details,
figcaption,
figure,
footer,
header,
hgroup,
menu,
nav,
section {
  display: block;
}
 
body {
  font-family: arial, sans-serif;
}
 
ol,
ul {
  list-style: none;
}
 
blockquote,
q {
  quotes: none;
}
 
blockquote:before,
blockquote:after,
q:before,
q:after {
  content: '';
  content: none;
}
 
ins {
  text-decoration: none;
}
 
del {
  text-decoration: line-through;
}
 
table {
  border-collapse: collapse;
  border-spacing: 0;
}
 
/* ------------ */
#wrapper {
  width: 100%;
  margin: 0 auto;
  height: 35px;
}
 
.img-preview {
  width: 160px;
  height: 90px;
  margin-top: 1em;
  border: 1px solid #ccc;
}
 
.cropper-wraper {
  position: relative;
}
 
.upload-btn {
  background: #ffffff;
  border: 1px solid #cfcfcf;
  color: #565656;
  padding: 10px 18px;
  display: inline-block;
  border-radius: 3px;
  margin-left: 10px;
  cursor: pointer;
  font-size: 14px;
 
  position: absolute;
  right: 1em;
  bottom: 2em;
}
.upload-btn:hover {
  background: #f0f0f0;
}
.uploader-container {
  width: 100%;
  font-size: 10px;
}
 
.webuploader-container {
  position: relative;
  width: 100px;
  height: 21px;
  float: left;
}
.webuploader-element-invisible {
  position: absolute !important;
  clip: rect(1px 1px 1px 1px); /* IE6, IE7 */
  clip: rect(1px, 1px, 1px, 1px);
}
.webuploader-pick {
  position: relative;
  display: inline-block;
  cursor: pointer;
  background: #00b7ee;
  padding: 6px 15px;
 
  color: #fff;
  text-align: center;
  border-radius: 3px;
  overflow: hidden;
}
.webuploader-pick-hover {
  background: #00a2d4;
}
 
.webuploader-pick-disable {
  opacity: 0.6;
  pointer-events: none;
}
.file-list {
  width: 100%;
}
.selected-video-name {
  font-size: 10px;
  color: grey;
}
div.webuploader-pick {
  width: 120px;
  height: 40px;
  max-height: 50px;
  padding: 1px;
  margin: 0;
  overflow: hidden;
}
#pick div label {
  height: 50px;
  max-height: 50px;
  overflow: hidden;
}
</style>
