import React, { useMemo, useState } from "react";
import { useGuiState } from "./001_GuiStateProvider";
import { useAppState } from "../../001_provider/001_AppStateProvider";
import { InitialFileUploadSetting, fileSelector } from "@dannadori/voice-changer-client-js";
import { useMessageBuilder } from "../../hooks/useMessageBuilder";


export type uploadData = {
    slot: number
    model: File | null
    index: File | null
}

const Mode = {
    "localFile": "localFile",
    "fromNet": "fromNet"
} as const
type Mode = typeof Mode[keyof typeof Mode]

export const ModelSlotManagerDialog = () => {
    const guiState = useGuiState()
    const { serverSetting } = useAppState()
    const [uploadData, setUploadData] = useState<uploadData | null>(null)
    const [mode, setMode] = useState<Mode>("localFile")
    const [fromNetTargetIndex, setFromNetTargetIndex] = useState<number>(0)
    const [lang, setLang] = useState<string>("All")
    const messageBuilderState = useMessageBuilder()

    useMemo(() => {
        messageBuilderState.setMessage(__filename, "change_icon", { "ja": "アイコン変更", "en": "chage icon" })
        messageBuilderState.setMessage(__filename, "rename", { "ja": "リネーム", "en": "rename" })
        messageBuilderState.setMessage(__filename, "download", { "ja": "ダウンロード", "en": "download" })
        messageBuilderState.setMessage(__filename, "terms_of_use", { "ja": "利用規約", "en": "terms of use" })
    }, [])
    /////////////////////////////////////////
    // Slot Manager
    /////////////////////////////////////////
    const localFileContent = useMemo(() => {
        if (mode != "localFile") {
            return <></>
        }
        if (!serverSetting.serverSetting.modelSlots) {
            return <></>
        }

        const checkExtention = (filename: string, acceptExtentions: string[]) => {
            const ext = filename.split('.').pop();
            if (!ext) {
                return false
            }
            return acceptExtentions.includes(ext)
        }

        const onRVCModelLoadClicked = async (slot: number) => {
            const file = await fileSelector("")
            if (checkExtention(file.name, ["pth", "onnx"]) == false) {
                alert(`モデルファイルの拡張子は".pth", ".onnx"である必要があります。`)
                return
            }
            if (uploadData?.slot == slot) {
                setUploadData({ ...uploadData, model: file })
            } else {
                const newUploadData = {
                    slot: slot,
                    model: file,
                    index: null
                }
                setUploadData(newUploadData)
            }
        }
        const onRVCIndexLoadClicked = async (slot: number) => {
            const file = await fileSelector("")
            if (checkExtention(file.name, ["index", "bin"]) == false) {
                alert(`モデルファイルの拡張子は".pth"である必要があります。`)
                return
            }
            if (uploadData?.slot == slot) {
                setUploadData({ ...uploadData, index: file })
            } else {
                const newUploadData = {
                    slot: slot,
                    model: null,
                    index: file
                }
                setUploadData(newUploadData)
            }
        }
        const onUploadClicked = async () => {
            if (!uploadData) {
                return
            }
            if (!uploadData.model) {
                return
            }
            serverSetting.fileUploadSettings[uploadData.slot] = {
                ...InitialFileUploadSetting,
                rvcModel: { file: uploadData.model },
                rvcIndex: uploadData.index ? { file: uploadData.index } : null,
                sampleId: null,
                isSampleMode: false
            }
            serverSetting.setFileUploadSetting(uploadData.slot, {
                ...serverSetting.fileUploadSettings[uploadData.slot]
            })
            await serverSetting.loadModel(uploadData.slot)
            setUploadData(null)
        }
        const onClearClicked = () => {
            setUploadData(null)
        }
        const onOpenSampleDownloadDialog = (index: number) => {
            setMode("fromNet")
            setFromNetTargetIndex(index)
        }


        const slots = serverSetting.serverSetting.modelSlots.map((x, index) => {
            let modelFileName = ""
            if (uploadData?.slot == index) {
                modelFileName = (uploadData.model?.name || "").replace(/^.*[\\\/]/, '')
            } else if (x.modelFile && x.modelFile.length > 0) {
                modelFileName = x.modelFile.replace(/^.*[\\\/]/, '')
            }
            if (modelFileName.length > 20) {
                modelFileName = modelFileName.substring(0, 20) + "..."
            }

            let indexFileName = ""
            if (uploadData?.slot == index) {
                indexFileName = (uploadData.index?.name || "").replace(/^.*[\\\/]/, '')
            } else if (x.indexFile && x.indexFile.length > 0) {
                indexFileName = x.indexFile.replace(/^.*[\\\/]/, '')
            }
            if (indexFileName.length > 20) {
                indexFileName = indexFileName.substring(0, 20) + "..."
            }

            const isRegisterd = modelFileName.length > 0 ? true : false
            const name = x.name && x.name.length > 0 ? x.name : isRegisterd ? modelFileName : "blank"
            const termOfUseUrlLink = x.termsOfUseUrl && x.termsOfUseUrl.length > 0 ? <a href={x.termsOfUseUrl} target="_blank" rel="noopener noreferrer" className="body-item-text-small">[{messageBuilderState.getMessage(__filename, "terms_of_use")}]</a> : <></>

            const nameValueClass = isRegisterd ? "model-slot-detail-row-value-pointable" : "model-slot-detail-row-value"
            const nameValueAction = isRegisterd ? async (index: number) => {
                const p = new Promise<string>((resolve) => {
                    guiState.setTextInputResolve({ resolve: resolve })
                })

                guiState.stateControls.showTextInputCheckbox.updateState(true)
                const text = await p;
                if (text.length > 0) {
                    console.log("input text:", text)
                    await serverSetting.updateModelInfo(index, "name", text)
                }
            } : async (_index: number) => { }
            const iconClass = isRegisterd ? "model-slot-icon-pointable" : "model-slot-icon"
            const iconAction = isRegisterd ? async (index: number) => {
                const file = await fileSelector("")
                if (checkExtention(file.name, ["png", "jpg", "jpeg", "gif"]) == false) {
                    alert(`モデルファイルの拡張子は".png", ".jpg", ".jpeg", ".gif"である必要があります。`)
                    return
                }
                await serverSetting.uploadAssets(index, "iconFile", file)
            } : async (_index: number) => { }

            const fileValueClass = (uploadData?.slot == index) ? "model-slot-detail-row-value-edit" : isRegisterd ? "model-slot-detail-row-value-download" : "model-slot-detail-row-value"
            const fileValueAction = (uploadData?.slot == index) ? (_url: string) => {
            } : isRegisterd ? (url: string) => {
                console.log("Download url:::", url)
                const link = document.createElement("a")
                link.href = "/" + url
                link.download = url.replace(/^.*[\\\/]/, '')
                link.click()
            } : (_url: string) => { }

            const iconUrl = x.modelFile && x.modelFile.length > 0 ? (x.iconFile && x.iconFile.length > 0 ? x.iconFile : "/assets/icons/noimage.png") : "/assets/icons/blank.png"

            return (
                <div key={index} className="model-slot">
                    <div className="tooltip">
                        <img src={iconUrl} className={iconClass} onClick={() => { iconAction(index) }} />
                        <div className="tooltip-text tooltip-text-thin tooltip-text-lower">
                            {messageBuilderState.getMessage(__filename, "change_icon")}
                        </div>
                    </div>
                    <div className="model-slot-detail">
                        <div className="model-slot-detail-row">
                            <div className="model-slot-detail-row-label">[{index}]</div>
                            <div className={nameValueClass + " tooltip"} onClick={() => { nameValueAction(index) }}>
                                {name}
                                <div className="tooltip-text tooltip-text-thin">
                                    {messageBuilderState.getMessage(__filename, "rename")}
                                </div>
                            </div>
                            <div className="">{termOfUseUrlLink}</div>
                        </div>
                        <div className="model-slot-detail-row">
                            <div className="model-slot-detail-row-label">model:</div>
                            <div className={fileValueClass + " tooltip"} onClick={() => { fileValueAction(x.modelFile) }}>
                                {modelFileName}
                                <div className="tooltip-text tooltip-text-thin">
                                    {messageBuilderState.getMessage(__filename, "download")}
                                </div>
                            </div>
                            <div className="model-slot-button  model-slot-detail-row-button" onClick={() => { onRVCModelLoadClicked(index) }}>select</div>
                        </div>
                        <div className="model-slot-detail-row">
                            <div className="model-slot-detail-row-label">index:</div>
                            <div className={fileValueClass + " tooltip"} onClick={() => { fileValueAction(x.indexFile) }}>
                                {indexFileName}
                                <div className="tooltip-text tooltip-text-thin">
                                    {messageBuilderState.getMessage(__filename, "download")}
                                </div>
                            </div>
                            <div className="model-slot-button model-slot-detail-row-button" onClick={() => { onRVCIndexLoadClicked(index) }}>select</div>
                        </div>
                        <div className="model-slot-detail-row">
                            <div className="model-slot-detail-row-label">info: </div>
                            <div className="model-slot-detail-row-value">{x.f0 ? "f0" : "nof0"}, {x.samplingRate}, {x.embChannels}, {x.modelType}, {x.defaultTune}, {x.defaultIndexRatio}, {x.defaultProtect}</div>
                            <div className=""></div>
                        </div>
                    </div>
                    <div className="model-slot-buttons">
                        {(uploadData?.slot == index) && (uploadData.model != null) ?
                            <div></div> :
                            <div className="model-slot-button" onClick={() => { onOpenSampleDownloadDialog(index) }}>DL sample&gt;&gt; </div>
                        }

                        {(uploadData?.slot == index) && (uploadData.model != null) ?
                            <div className="model-slot-button" onClick={onUploadClicked}>upload</div> : <div></div>
                        }
                        {(uploadData?.slot == index) && (uploadData.model != null || uploadData.index != null) ?
                            <div className="model-slot-button" onClick={onClearClicked}>clear</div> : <div></div>
                        }
                        {(uploadData?.slot == index) && (uploadData.model != null) ?
                            <div>{serverSetting.uploadProgress.toFixed(1)}%</div> : <div></div>
                        }


                    </div>
                </div >
            )
        })

        return (
            <div className="model-slot-container">
                {slots}
            </div>
        );

    }, [
        mode,
        serverSetting.serverSetting.modelSlots,
        serverSetting.fileUploadSettings,
        serverSetting.uploadProgress,
        serverSetting.setFileUploadSetting,
        serverSetting.loadModel,
        uploadData
    ])


    /////////////////////////////////////////
    // Sample Downloader
    /////////////////////////////////////////
    const fromNetContent = useMemo(() => {
        if (mode != "fromNet") {
            return <></>
        }

        const langs = serverSetting.serverSetting.sampleModels.reduce((prev, cur) => {
            if (prev.includes(cur.lang) == false) {
                prev.push(cur.lang)
            }
            return prev
        }, ["All"] as string[])
        const langOptions = (
            langs.map(x => {
                return <option key={x} value={x}>{x}</option>
            })
        )

        const onDownloadSampleClicked = async (id: string) => {
            serverSetting.fileUploadSettings[fromNetTargetIndex] = {
                ...InitialFileUploadSetting,
                rvcModel: null,
                rvcIndex: null,
                sampleId: id,
                isSampleMode: true
            }
            try {
                await serverSetting.loadModel(fromNetTargetIndex)
            } catch (e) {
                alert(e)
            }
            setMode("localFile")
        }
        const options = (
            serverSetting.serverSetting.sampleModels.filter(x => { return lang == "All" ? true : x.lang == lang }).map((x, index) => {
                const termOfUseUrlLink = x.termsOfUseUrl && x.termsOfUseUrl.length > 0 ? <a href={x.termsOfUseUrl} target="_blank" rel="noopener noreferrer" className="body-item-text-small">[{messageBuilderState.getMessage(__filename, "terms_of_use")}]</a> : <></>

                return (
                    <div key={index} className="model-slot">
                        <img src={x.icon} className="model-slot-icon"></img>
                        <div className="model-slot-detail">
                            <div className="model-slot-detail-row">
                                <div className="model-slot-detail-row-label">name:</div>
                                <div className="model-slot-detail-row-value">{x.name}</div>
                                <div className="">{termOfUseUrlLink}</div>
                            </div>
                            <div className="model-slot-detail-row">
                                <div className="model-slot-detail-row-label">info: </div>
                                <div className="model-slot-detail-row-value">{x.modelType},{x.f0 ? "f0" : "nof0"},{x.sampleRate}</div>
                                <div className=""></div>
                            </div>
                        </div>
                        <div className="model-slot-buttons">
                            <div className="model-slot-button" onClick={() => { onDownloadSampleClicked(x.id) }}>download</div>
                        </div>
                    </div>
                )
            })
        )

        return (
            <div className="">
                <div className="model-slot-header">Select Sample for Slot[{fromNetTargetIndex}]  <span onClick={() => { setMode("localFile") }} className="model-slot-header-button">&lt;&lt;back</span></div>
                <div>Lang:
                    <select value={lang} onChange={(e) => { setLang(e.target.value) }}>
                        {langOptions}
                    </select>
                </div>

                <div className="model-slot-container">
                    {options}
                </div>

            </div>
        )

    }, [
        mode,
        fromNetTargetIndex,
        lang
    ])


    const dialog = useMemo(() => {
        const closeButtonRow = (
            <div className="body-row split-3-4-3 left-padding-1">
                <div className="body-item-text">
                </div>
                <div className="body-button-container body-button-container-space-around">
                    <div className="body-button" onClick={() => { guiState.stateControls.showModelSlotManagerCheckbox.updateState(false) }} >close</div>
                </div>
                <div className="body-item-text"></div>
            </div>
        )
        return (
            <div className="dialog-frame">
                <div className="dialog-title">{mode == "localFile" ? "Model Slot Configuration" : "Sample Downloader"}</div>
                <div className="dialog-fixed-size-content">
                    {localFileContent}
                    {fromNetContent}
                    {closeButtonRow}
                </div>
            </div>
        );

    }, [
        localFileContent,
        fromNetContent,
        fromNetTargetIndex,
    ]);

    return dialog;

};
