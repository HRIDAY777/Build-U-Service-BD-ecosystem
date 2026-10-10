import { ProjectPlans } from "@/components/project-plans";
import { ProjectGallery } from "@/components/project-gallery";

export const metadata = {
  title: "Projects & proposed investment plans | U Service",
};

export default function ProjectsPage() {
  return (
    <>
      <ProjectPlans />
      <div className="page-wrap">
        <ProjectGallery />
      </div>
    </>
  );
}
