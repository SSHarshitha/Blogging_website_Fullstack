import { Link, useNavigate } from "react-router-dom";
import logo from "../imgs/logo.png";
import AnimationWrapper from "../common/page-animation";
import defaultBanner from "../imgs/blog banner.png";
import { uploadImage } from "../common/aws";
import { useContext, useEffect, useRef } from "react";
import { Toaster, toast } from "react-hot-toast";
import { EditorContext } from "../pages/editor.pages";
import EditorJS from "@editorjs/editorjs";
import { tools } from "./tools.component";
import axios from "axios";
import { UserContext } from "../App";

const BlogEditor = () => {
  let { blog, blog: { title, banner, content, tags, des }, setBlog, textEditor, setTextEditor, setEditorState } = useContext(EditorContext);
  let { userAuth: { access_token } } = useContext(UserContext);
  let navigate = useNavigate();

  //useEffect
  useEffect(() => {
    if (!textEditor.isReady) {
      setTextEditor(new EditorJS({
        holder: "text-Editor",
        data: content,
        tools: tools,
        placeholder: "Let's write an awesome story",
      }));
    }
  }, []);

  // useEffect(()=>{
  //   console.log("Banner url updated:",banner);

  // },[banner])


  const handleBannerUpload = async (e) => {
    let img = e.target.files[0];
    console.log('Selected image',img);

    if (img) {
      let loadingToast = toast.loading("Uploading...");
      try {
        const url = await uploadImage(img);
        console.log("Uploaded image url",url);
        toast.dismiss(loadingToast);
        toast.success("Uploaded");
        setBlog({ ...blog, banner: url });
      } catch (err) {
        toast.dismiss(loadingToast);
        toast.error(err.message);
      }
    }
  };

  const handleTitleKeyDown = (e) => {
    if (e.keyCode == 13) {
      e.preventDefault();
    }
  }

  const handleTitleChange = (e) => {
    let input = e.target;
    input.style.height = 'auto';
    input.style.height = input.scrollHeight + "px";
    setBlog({ ...blog, title: input.value });
  }

  const handleError = (e) => {
    let img = e.target;
    img.src = defaultBanner;
  }

  const handleSaveDraft = async (e) => {
    if (e.target.className.includes("disable")) {
      return;
    }

    if (!title.length) {
      return toast.error("Write blog title before saving to draft.");
    }

    let loadingToast = toast.loading("Saving Draft...");
    e.target.classList.add('disable');

    try {
      if (textEditor.isReady) {
        const content = await textEditor.save();
        let blogObj = { title, banner, des, content, tags, draft: true };
        await axios.post(`${import.meta.env.VITE_SERVER_DOMAIN}/create-blog`, blogObj, {
          headers: { 'Authorization': `Bearer ${access_token}` }
        });
        e.target.classList.remove('disable');
        toast.dismiss(loadingToast);
        toast.success("Draft Saved");
        setTimeout(() => { navigate("/") }, 500);
      }
    } catch (error) {
      e.target.classList.remove('disable');
      toast.dismiss(loadingToast);
      toast.error(error.response?.data?.error || "An error occurred");
    }
  }

  const handlePublishEvent = async () => {
    if (!banner.length) {
      return toast.error("Upload a Blog Banner to publish it");
    }
    if (!title.length) {
      return toast.error("Write Blog title to publish it");
    }

    try {
      if (textEditor.isReady) {
        const data = await textEditor.save();
        if (data.blocks.length) {
          setBlog({ ...blog, content: data });
          setEditorState("publish");
        } else {
          toast.error("Write something in your blog to publish it");
        }
      }
    } catch (err) {
      console.error(err);
      toast.error("An error occurred while saving the blog content");
    }
  }

  return (
    <>
      <nav className="navbar">
        <Link to="/" className="flex-non w-10">
          <img src={logo} />
        </Link>
        <p className="max-md:hidden text-black line-clamp-1 w-full">
          {title.length ? title : "New Blog"}
        </p>
        <div className="flex gap-4 ml-auto">
          <button className="btn-dark py-2" onClick={handlePublishEvent}>
            Publish
          </button>
          <button className="btn-light py-2" onClick={handleSaveDraft}>
            Save Draft
          </button>
        </div>
      </nav>

      <Toaster />
      <AnimationWrapper>
        <section>
          <div className="max-auto max-w-[900px] w-full">
            <div className="relative aspect-video hover:opacity-80 bg-white border-4 border-grey">
              <label htmlFor="uploadBanner">
                <img src={banner} className="z-20" onError={handleError} />
                <input
                  id="uploadBanner"
                  type="file"
                  accept=".png, .jpg, .jpeg"
                  hidden
                  onChange={handleBannerUpload}
                />
              </label>
            </div>

            <textarea
              defaultValue={title}
              placeholder="Blog Title"
              className="text-4xl font-medium w-full h-29 outline-none resize-none mt-10 leading-tight placeholder:opacity-40"
              onKeyDown={handleTitleKeyDown}
              onChange={handleTitleChange}
            ></textarea>
            <hr className="w-full opacity-10 my-5" />

            <div id="text-Editor" className="font-gelasio"></div>
          </div>
        </section>
      </AnimationWrapper>
    </>
  );
}

export default BlogEditor;
