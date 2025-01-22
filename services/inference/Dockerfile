FROM mcr.microsoft.com/azureml/base:latest

# Copy the environment.yml file into the container
COPY environment.yml /tmp/environment.yml

RUN pip install --upgrade pip


# Install the dependencies
RUN conda env create -f /tmp/environment.yml && conda clean -a

# Set the default environment to activate
RUN echo "source activate my-inference-env" > ~/.bashrc

# Set the default environment to activate using ENTRYPOINT
#ENTRYPOINT ["conda", "run", "-n", "my-inference-env", "python"]

# # Start with the AzureML base image
# FROM mcr.microsoft.com/azureml/base:latest

# # Set the working directory
# WORKDIR /mnt/batch/tasks/shared/LS_root/mounts/workspace

# # Copy the environment.yml file into the Docker image
# COPY environment.yml /tmp/environment.yml

# # Install Conda (if not already available in base image)
# RUN apt-get update && apt-get install -y \
#     wget \
#     bzip2 \
#     ca-certificates && \
#     wget -qO- https://repo.anaconda.com/archive/Anaconda3-2021.11-Linux-x86_64.sh -O /tmp/anaconda.sh && \
#     bash /tmp/anaconda.sh -b -p /opt/conda && \
#     rm /tmp/anaconda.sh && \
#     /opt/conda/bin/conda init bash

# # Set conda environment path
# ENV PATH /opt/conda/bin:$PATH

# # Install the dependencies specified in environment.yml
# RUN conda env create -f /tmp/environment.yml && conda clean -a

# # Set the default environment to activate
# RUN echo "conda activate my-inference-env" >> ~/.bashrc

# # Set the entrypoint for the container
# ENTRYPOINT [ "bash", "-c", "source ~/.bashrc && tail -f /dev/null" ]
