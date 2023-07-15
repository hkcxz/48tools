import { parse, ParsedPath } from 'node:path';
import * as FluentFFmpeg from 'fluent-ffmpeg';
import type { FfmpegCommand } from 'fluent-ffmpeg';
import liveStatus from '../liveStatus';

export type WorkerEventData = {
  type: 'start' | 'stop'; // 执行的方法
  playStreamPath: string; // 媒体地址
  filePath: string;       // 文件保存地址
  ffmpeg: string;         // ffmpeg地址
  liveId: string;         // 播放ID
};

let command: FfmpegCommand;
let isKilled: boolean = false; // 手动结束
let retryIndex: number = 0;    // 重试次数

function endCallback(workerData: WorkerEventData): void {
  if (isKilled) {
    postMessage({ type: 'close' });
  } else {
    liveStatus(workerData.liveId).then((r: boolean): void => {
      if (r) {
        retryIndex++;
        // eslint-disable-next-line @typescript-eslint/no-use-before-define
        download(workerData, true);
      } else {
        postMessage({ type: 'close' });
      }
    });
  }
}

/**
 * 转码并下载
 * https://stackoverflow.com/questions/16658873/how-to-minimize-the-delay-in-a-live-streaming-with-ffmpeg
 * https://stackoverflow.com/questions/55914754/how-to-fix-non-monotonous-dts-in-output-stream-01-when-using-ffmpeg
 * TODO: 连麦错误原因在于连麦和非连麦录制时DTS不统一，编码采用开始时的信息，导致花屏。
 *       修复方式为每次录制都重新编码，不过最后的视频会有错误，错误信息
 *       [DTS discontinuity in stream 0: packet 3 with DTS 135001, packet 4 with DTS 144000]
 */
function download(workerData: WorkerEventData, isRetryDownload?: boolean): void {
  const { ffmpeg, playStreamPath, filePath }: WorkerEventData = workerData;
  let filePath2: string = filePath;

  if (isRetryDownload) {
    const parseResult: ParsedPath = parse(filePath);

    filePath2 = `${ parseResult.dir }/${ parseResult.name }(${ retryIndex })${ parseResult.ext }`;
  }

  if (ffmpeg && ffmpeg !== '') {
    FluentFFmpeg.setFfmpegPath(ffmpeg);
  }

  command = FluentFFmpeg(playStreamPath)
    .inputOptions(['-rw_timeout', `${ (1_000 ** 2) * 60 * 5 }`, '-re', '-accurate_seek'])
    .videoCodec('copy')
    .audioCodec('copy')
    .fps(30)
    .output(filePath2)
    .on('end', function(): void {
      endCallback(workerData);
    })
    .on('error', function(err: Error, stdout: string, stderr: string): void {
      if (err.message.includes('ffmpeg exited')) {
        endCallback(workerData);
      } else {
        postMessage({ type: 'error', error: err });
      }
    });

  command.run();
}

/* 停止下载 */
function stop(): void {
  isKilled = true;
  command.kill('SIGTERM');
}

addEventListener('message', function(event: MessageEvent<WorkerEventData>): void {
  const { type }: WorkerEventData = event.data;

  switch (type) {
    case 'start':
      download(event.data);
      break;

    case 'stop':
      stop();
      break;
  }
});